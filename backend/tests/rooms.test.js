const test = require('node:test');
const assert = require('node:assert/strict');
const { createRoomController } = require('../controller/instructor/roomController');
const response = () => ({ code: 200, body: null, status(code) {this.code=code;return this;},json(body){this.body=body;return this;} });
const input = {roomName:'Study room',roomCode:'study',testModule:'1234567890abcdef12345678',startDate:'2099-01-15',startTime:'10:00',endTime:'11:00'};

test('invalid room times and identifiers fail before any persistence', async () => {
  const api = createRoomController({$transaction:()=>assert.fail('must validate before DB')});
  for (const change of [{endTime:'09:00'},{startDate:'2099-02-30'},{startTime:'25:00'},{roomName:{}},{testModule:'bad'}]) {
    const res=response(); await api.createRoom({body:{...input,...change}},res); assert.equal(res.code,400);
  }
});
test('valid same-day India schedule maps to the intended UTC interval', async () => {
  let saved;
  const api=createRoomController({activeRoom:{findUnique:async()=>null},scheduledRoom:{findUnique:async()=>null,create:async({data})=>{saved=data;return data;}},pastRoom:{findUnique:async()=>null},$transaction:async work=>Promise.all(work)});
  const res=response();await api.createRoom({body:input},res);
  assert.equal(res.code,200);assert.equal(saved.startTime.toISOString(),'2099-01-15T04:30:00.000Z');
  assert.equal(saved.endTime.toISOString(),'2099-01-15T05:30:00.000Z');
});
test('activate now opens a future scheduled room immediately and refuses expired rooms', async () => {
  const before=Date.now();let saved;
  const room={roomName:'Study',roomCode:'study',testModuleId:input.testModule,startTime:new Date(before+600000),endTime:new Date(before+1200000)};
  const db={scheduledRoom:{findUnique:async()=>room,delete:async()=>{}},activeRoom:{create:async({data})=>{saved=data;return data;}}};
  db.$transaction=async work=>work(db);
  const api=createRoomController(db),res=response();await api.activateScheuledRoomNow({params:{roomId:input.testModule}},res);
  assert.equal(res.code,200);assert.ok(saved.startTime.getTime()>=before);assert.ok(saved.startTime.getTime()<=Date.now());
  room.endTime=new Date(before-1);saved=null;const expired=response();await api.activateScheuledRoomNow({params:{roomId:input.testModule}},expired);
  assert.equal(expired.code,400);assert.equal(saved,null);
});
