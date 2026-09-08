const test = require('node:test');
const assert = require('node:assert/strict');
const { gradeAnswers, validateQuestionFile, requireOpenRoom } = require('../domain/quiz');
const questions=[{id:'q1',correct:'A',options:[{text:'A'},{text:'B'}]},{id:'q2',correct:'D',options:[{text:'C'},{text:'D'}]}];

test('grades only supplied answers from the assigned test module',()=>{
 assert.equal(gradeAnswers({q1:'A',q2:'C'},questions),1);
 assert.equal(gradeAnswers({q1:'A'},questions),1);
 assert.throws(()=>gradeAnswers({otherModuleQuestion:'A'},questions),/assigned/);
});
test('rejects malformed answer objects and impossible choices',()=>{
 for(const answers of [null,[],true,'A',{q1:1},{q1:'not an option'}])assert.throws(()=>gradeAnswers(answers,questions));
});
test('request-time room state cannot depend on a cron sweep',()=>{
 const room={startTime:'2026-09-08T10:00:00Z',endTime:'2026-09-08T11:00:00Z'};
 assert.doesNotThrow(()=>requireOpenRoom(room,new Date('2026-09-08T10:30:00Z')));
 for(const t of ['2026-09-08T09:59:59Z','2026-09-08T11:00:00Z'])assert.throws(()=>requireOpenRoom(room,new Date(t)),/active/);
 assert.throws(()=>requireOpenRoom({startTime:'bad',endTime:'bad'},new Date()));
});
test('validates the complete question file before any persistence',()=>{
 const valid={question:'Question?',options:['A','B'],answer:'A'};
 assert.deepEqual(validateQuestionFile([valid]),[valid]);
 for(const value of [[],[valid,{...valid,answer:'C'}],[valid,{...valid,options:['A','A']}],[{...valid,question:'   '}],[{...valid,options:['A',2]}]])assert.throws(()=>validateQuestionFile(value));
});
