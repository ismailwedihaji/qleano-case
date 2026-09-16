'use strict';

// These tests cover the logging setup itself, not the case. They should stay
// green while you work.

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../src/app');
const { logger, createLogger, LEVELS } = require('../src/logger');

const app = createApp();

test('logging is silent while the test suite runs', () => {
  assert.equal(logger.level, 'silent');
  assert.equal(LEVELS.silent > LEVELS.error, true);
});

test('every response carries an x-request-id header', async () => {
  const res = await request(app).get('/health').expect(200);
  assert.match(res.headers['x-request-id'], /^\S+$/);
});

test('a caller-supplied x-request-id is echoed back', async () => {
  const res = await request(app)
    .get('/health')
    .set('x-request-id', 'trace-me')
    .expect(200);

  assert.equal(res.headers['x-request-id'], 'trace-me');
});

test('child loggers keep their bindings and expose all levels', () => {
  const child = createLogger({ requestId: 'abc' }).child({ userId: 7 });

  for (const level of ['debug', 'info', 'warn', 'error']) {
    assert.equal(typeof child[level], 'function');
  }
  // Calling a logger must never throw, whatever it is handed.
  child.info('hello', { nested: { deep: [1, 2, 3] }, password: 'hunter2' });
});
