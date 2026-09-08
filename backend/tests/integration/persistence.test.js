const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { createQuestionController } = require('../../controller/instructor/questionUploadController');
const { createQuizController } = require('../../controller/student/quizController');
const url = process.env.QUIZBEE_TEST_DATABASE_URL;
if (!url || !url.startsWith('mongodb://127.0.0.1:27028/quizbee_portfolio_test?')) throw new Error('Use the isolated localhost:27028 quizbee_portfolio_test replica set');
const prisma = new PrismaClient({ datasources: { db: { url } } });
const response = () => ({ code: 200, body: null, status(code) {this.code=code; return this;}, json(body) {this.body=body; return this;} });

test('real MongoDB persists nested question imports and server-graded results', async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const moduleName = `fixture-${suffix}`;
  let module, student, room;
  try {
    const importer = createQuestionController(prisma);
    const file = Buffer.from(JSON.stringify([{ question: 'TEST FIXTURE: FIFO structure?', options: ['Queue', 'Stack'], answer: 'Queue' }]));
    const imported = response();
    await importer.uploadQuestions({ body: { testModuleName: moduleName }, file: { size: file.length, buffer: file } }, imported);
    assert.equal(imported.code, 200);
    module = await prisma.testModule.findUnique({ where: { name: moduleName }, include: { questions: { include: { options: true } } } });
    assert.equal(module.questions.length, 1);
    assert.equal(module.questions[0].options.length, 2);
    student = await prisma.student.create({ data: { name: 'Integration fixture', username: suffix, email: `${suffix}@example.invalid`, password: 'not-a-login-credential' } });
    room = await prisma.activeRoom.create({ data: { roomName: moduleName, roomCode: suffix, testModuleId: module.id, startTime: new Date(Date.now()-10000), endTime: new Date(Date.now()+60000) } });
    const res = response();
    await createQuizController(prisma).submitQuiz({ user: { id: student.id }, body: { roomCode: room.roomCode, answers: { [module.questions[0].id]: 'Queue' } } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.score, 1);
    const attempt = await prisma.quizAttempt.findFirst({ where: { studentId: student.id } });
    const board = await prisma.leaderbaord.findFirst({ where: { studentId: student.id } });
    assert.equal(attempt.score, 1);
    assert.equal(board.score, 1);
    const denied = response();
    await importer.deleteTestModule({params: {moduleId: module.id}}, denied);
    assert.equal(denied.code, 400);
    assert.equal(await prisma.question.count({where: {testModuleId: module.id}}), 1);
    const failing = new Proxy(prisma, { get(target, property) {
      if (property === '$transaction') return work => target.$transaction(tx => work(new Proxy(tx, {get(inner, key) {
        if (key === 'leaderbaord') return {upsert: async () => { throw new Error('TEST FIXTURE injected persistence failure'); }};
        return inner[key];
      }})));
      return target[property];
    }});
    const failed = response();
    await createQuizController(failing).submitQuiz({user: {id: student.id}, body: {roomCode: room.roomCode, answers: {[module.questions[0].id]: 'Queue'}}}, failed);
    assert.equal(failed.code, 500);
    assert.equal(await prisma.quizAttempt.count({where: {studentId: student.id}}), 1, 'failed leaderboard write rolls the new attempt back');
  } finally {
    if (student) { await prisma.leaderbaord.deleteMany({ where: { studentId: student.id } }); await prisma.quizAttempt.deleteMany({ where: { studentId: student.id } }); }
    if (room) await prisma.activeRoom.delete({ where: { id: room.id } });
    if (module) { await prisma.option.deleteMany({ where: { questionId: { in: module.questions.map(q=>q.id) } } }); await prisma.question.deleteMany({ where: { testModuleId: module.id } }); await prisma.testModule.delete({ where: { id: module.id } }); }
    if (student) await prisma.student.delete({ where: { id: student.id } });
    await prisma.$disconnect();
  }
});
