const test=require('node:test');const assert=require('node:assert/strict');
const {createQuestionController}=require('../controller/instructor/questionUploadController');
const res=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('a malformed later question causes no module or question writes',async()=>{
 const writes=[];const db={testModule:{findUnique:async()=>null,create:async value=>writes.push(value)}};
 const controller=createQuestionController(db),response=res();
 const body=JSON.stringify([{question:'Good?',options:['A','B'],answer:'A'},{question:'Bad?',options:['A','B'],answer:'C'}]);
 await controller.uploadQuestions({file:{buffer:Buffer.from(body),size:body.length},body:{testModuleName:'Test'}},response);
 assert.equal(response.code,400);assert.equal(writes.length,0);
});
test('valid questions and options persist through one nested atomic write',async()=>{
 const writes=[];const db={testModule:{findUnique:async()=>null,create:async value=>{writes.push(value);return {id:'module'};}}};
 const controller=createQuestionController(db),response=res();
 const body=JSON.stringify([{question:'Good?',options:['A','B'],answer:'A'}]);
 await controller.uploadQuestions({file:{buffer:Buffer.from(body),size:body.length},body:{testModuleName:'Test'}},response);
 assert.equal(response.code,200);assert.equal(writes.length,1);assert.equal(writes[0].data.questions.create[0].options.create.length,2);
});
