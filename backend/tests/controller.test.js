const test=require('node:test');
const assert=require('node:assert/strict');
const {createQuizController}=require('../controller/student/quizController');
function response(){return {code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
function fixture(){
 const writes=[];
 const question={id:'q1',correct:'A',options:[{text:'A'},{text:'B'}]};
 const room={roomName:'room',testModuleId:'module',startTime:new Date(Date.now()-10000),endTime:new Date(Date.now()+10000)};
 const prisma={activeRoom:{findUnique:async()=>room},student:{findUnique:async()=>({id:'student'})},question:{findMany:async query=>{assert.equal(query.where.testModuleId,'module');return [question];}},quizAttempt:{create:async data=>writes.push(data)},leaderbaord:{upsert:async data=>writes.push(data)}};
 return {api:createQuizController(prisma),writes,room};
}
test('out-of-module answers are rejected before either database write',async()=>{
 const {api,writes}=fixture(),res=response();
 await api.submitQuiz({body:{roomCode:'room',answers:{other:'A'}},user:{id:'student'}},res);
 assert.equal(res.code,400);assert.deepEqual(writes,[]);
});
test('valid module answers preserve protocol and score on server',async()=>{
 const {api,writes}=fixture(),res=response();
 await api.submitQuiz({body:{roomCode:'room',answers:{q1:'A'}},user:{id:'student'}},res);
 assert.equal(res.code,200);assert.equal(res.body.score,1);assert.equal(writes.length,2);
});
test('expired room cannot accept submission before cron cleanup',async()=>{
 const {api,writes,room}=fixture(),res=response();room.endTime=new Date(Date.now()-1);
 await api.submitQuiz({body:{roomCode:'room',answers:{q1:'A'}},user:{id:'student'}},res);
 assert.equal(res.code,400);assert.equal(writes.length,0);
});
