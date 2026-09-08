const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const auth = require('../controller/instructor/instructorAuthController');

test('instructor local login sets a usable HttpOnly cookie and logout clears same scope', async () => {
  process.env.NODE_ENV = 'test';
  process.env.ADMIN_USERNAME = 'local-test-instructor';
  process.env.ADMIN_PWD = await bcrypt.hash('local-test-password', 4);
  process.env.JWT_KEY = 'isolated-test-signing-key';
  const cookies = [];
  const res = { cookie(name, value, options) { cookies.push({name,value,options}); }, status(code) { assert.equal(code, 200); return this; }, json() {} };
  await auth.login({body: {username: 'local-test-instructor', password: 'local-test-password'}}, res);
  assert.equal(cookies[0].options.secure, false);
  assert.equal(cookies[0].options.httpOnly, true);
  assert.equal(cookies[0].options.sameSite, 'lax');
  auth.logout({}, res);
  assert.equal(cookies[1].options.path, cookies[0].options.path);
  assert.equal(cookies[1].options.sameSite, cookies[0].options.sameSite);
  assert.equal(cookies[1].options.maxAge, 0);
});

test('missing instructor configuration and malformed login return controlled errors', async () => {
  process.env.ADMIN_USERNAME = 'configured-instructor';
  delete process.env.ADMIN_PWD;
  const response = () => ({code: 200,status(code){this.code=code;return this;},json(){}});
  const absent=response();
  await auth.login({body:{username:'configured-instructor',password:'input'}},absent);
  assert.equal(absent.code,503);
  const invalid=response();
  await auth.login({body:{username:[],password:{}}},invalid);
  assert.equal(invalid.code,400);
});
