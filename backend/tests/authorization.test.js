const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
process.env.JWT_KEY = 'local-test-key-for-isolated-tests-only';
const testsRouter = require('../routes/instructor/testRoutes');
const roomsRouter = require('../routes/instructor/roomRoutes');

test('instructor mutations reject anonymous and student requests before parsing or persistence', async () => {
  const app = express();
  app.use(cookieParser());
  app.use('/tests', testsRouter);
  app.use('/room', roomsRouter);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [method, path] of [['POST','/tests/upload-test'], ['DELETE','/tests/delete-module/abc'], ['POST','/room/create-room'], ['POST','/room/activate-room/abc']]) {
      for (const cookie of ['', `token=${jwt.sign({ id: 'student', role: 'student' }, process.env.JWT_KEY)}`]) {
        const response = await fetch(base + path, { method, headers: { cookie } });
        assert.equal(response.status, 403, `${method} ${path}`);
      }
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('role gate permits a verified instructor and rejects an absent principal', () => {
  const { requireRole } = require('../middleware/authMiddleware');
  let advanced = false;
  requireRole('instructor')({ user: { role: 'instructor' } }, {}, () => { advanced = true; });
  assert.equal(advanced, true);
  const res = { status(code) { assert.equal(code, 403); return this; }, json(value) { assert.equal(value.message, 'Forbidden'); } };
  requireRole('instructor')({}, res, () => assert.fail('must reject'));
});
