'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../src/app');
const store = require('../src/data/store');

const app = createApp();

test.beforeEach(() => {
  store.__reset();
});

test('GET /api/assignments?consultantId=1 returns only that consultant\'s assignments', async () => {
  const res = await request(app).get('/api/assignments?consultantId=1').expect(200);

  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].consultantId, 1);
});

test('POST /api/assignments books an assignment that does not clash', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 1,
      title: 'Short pre-study',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
    })
    .expect(201);

  assert.equal(res.body.consultantId, 1);
  assert.ok(res.body.id);
});

test('POST /api/assignments returns 409 when the new assignment overlaps an existing one', async () => {
  // Consultant 1 is already booked 2026-03-01 - 2026-06-30.
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 1,
      title: 'Clashing assignment',
      startDate: '2026-04-01',
      endDate: '2026-05-01',
    })
    .expect(409);

  assert.ok(res.body.error);
});

test('POST /api/assignments returns 409 when only the tail end overlaps', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 1,
      title: 'Overlaps the start',
      startDate: '2026-01-15',
      endDate: '2026-03-15',
    })
    .expect(409);

  assert.ok(res.body.error);
});

test('POST /api/assignments returns 404 for an unknown consultant', async () => {
  await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 999,
      title: 'Assignment without a consultant',
      startDate: '2026-09-01',
      endDate: '2026-10-01',
    })
    .expect(404);
});

test('POST /api/assignments returns 400 when title is missing', async () => {
  await request(app)
    .post('/api/assignments')
    .send({ consultantId: 2, startDate: '2026-09-01', endDate: '2026-10-01' })
    .expect(400);
});

// An unparsable date must be rejected.
test('POST /api/assignments returns 400 for an invalid date', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 2,
      title: 'Invalid date test',
      startDate: 'not-a-date',
      endDate: '2026-10-01',
    })
    .expect(400);

  assert.ok(res.body.error);
});

// endDate must be strictly after startDate.
test('POST /api/assignments returns 400 when endDate is not after startDate', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 2,
      title: 'Invalid date range',
      startDate: '2026-10-20',
      endDate: '2026-10-01',
    })
    .expect(400);

  assert.ok(res.body.error);
});

// Without a consultantId filter, all assignments should be returned.
test('GET /api/assignments returns all assignments', async () => {
  const res = await request(app)
    .get('/api/assignments')
    .expect(200);

  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.total, 2);
});


// A consultant with no assignments should return an empty list.
test('GET /api/assignments returns an empty list when no assignments match', async () => {
  const res = await request(app)
    .get('/api/assignments?consultantId=2')
    .expect(200);

  assert.equal(res.body.items.length, 0);
  assert.equal(res.body.total, 0);
});

// Different consultants may be booked during the same period.
test('POST /api/assignments allows overlapping dates for another consultant', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 2,
      title: 'Parallel assignment',
      startDate: '2026-03-01',
      endDate: '2026-04-01',
    })
    .expect(201);

  assert.equal(res.body.consultantId, 2);
  assert.ok(res.body.id);
});


// Both startDate and endDate are required.
test('POST /api/assignments returns 400 when endDate is missing', async () => {
  const res = await request(app)
    .post('/api/assignments')
    .send({
      consultantId: 2,
      title: 'Missing end date',
      startDate: '2026-10-01',
    })
    .expect(400);

  assert.ok(res.body.error);
});