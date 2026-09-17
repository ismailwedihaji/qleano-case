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

test('GET /health responds with ok', async () => {
  const res = await request(app).get('/health').expect(200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('GET /api/consultants page 1 returns the first three consultants', async () => {
  const res = await request(app)
    .get('/api/consultants?page=1&pageSize=3')
    .expect(200);

  assert.deepEqual(
    res.body.items.map((c) => c.id),
    [1, 2, 3]
  );
});

test('GET /api/consultants page 2 returns the next three consultants', async () => {
  const res = await request(app)
    .get('/api/consultants?page=2&pageSize=3')
    .expect(200);

  assert.deepEqual(
    res.body.items.map((c) => c.id),
    [4, 5, 6]
  );
});

test('GET /api/consultants?available=false returns only unavailable consultants', async () => {
  const res = await request(app)
    .get('/api/consultants?available=false')
    .expect(200);

  assert.ok(res.body.items.length > 0, 'expected at least one unavailable consultant');
  assert.ok(
    res.body.items.every((c) => c.available === false),
    'every match must have available === false'
  );
});

test('GET /api/consultants?skill=node.js matches regardless of casing', async () => {
  const res = await request(app)
    .get('/api/consultants?skill=node.js')
    .expect(200);

  assert.equal(res.body.items.length, 4);
});

test('GET /api/consultants/:id returns the consultant', async () => {
  const res = await request(app).get('/api/consultants/2').expect(200);

  assert.equal(res.body.id, 2);
  assert.equal(res.body.name, 'Bassam Haddad');
});

test('GET /api/consultants/:id returns 404 for an unknown consultant', async () => {
  const res = await request(app).get('/api/consultants/999').expect(404);

  assert.match(res.headers['content-type'], /application\/json/);
  assert.ok(res.body.error, 'the response must contain an error message');
});

test('GET /api/consultants/:id returns 400 for an invalid id', async () => {
  const res = await request(app).get('/api/consultants/abc').expect(400);

  assert.match(res.headers['content-type'], /application\/json/);
  assert.ok(res.body.error, 'the response must contain an error message');
});

test('POST /api/consultants creates a consultant and responds 201', async () => {
  const res = await request(app)
    .post('/api/consultants')
    .send({
      name: 'Karin Frost',
      email: 'karin@example.com',
      skills: ['Node.js'],
      hourlyRate: 900,
      yearsOfExperience: 6,
    })
    .expect(201);

  assert.ok(res.body.id, 'the created consultant must have an id');
  assert.equal(res.body.name, 'Karin Frost');
});

test('POST /api/consultants accepts a junior with 0 rate and 0 years of experience', async () => {
  const res = await request(app)
    .post('/api/consultants')
    .send({
      name: 'Nils Intern',
      email: 'nils@example.com',
      skills: ['Node.js'],
      hourlyRate: 0,
      yearsOfExperience: 0,
    })
    .expect(201);

  assert.equal(res.body.hourlyRate, 0);
  assert.equal(res.body.yearsOfExperience, 0);
});

test('POST /api/consultants returns 400 when name is missing', async () => {
  const res = await request(app)
    .post('/api/consultants')
    .send({ email: 'x@example.com', skills: [], hourlyRate: 800, yearsOfExperience: 2 })
    .expect(400);

  assert.ok(res.body.error);
});

test('PATCH /api/consultants/:id updates the hourly rate', async () => {
  const res = await request(app)
    .patch('/api/consultants/2')
    .send({ hourlyRate: 999 })
    .expect(200);

  assert.equal(res.body.hourlyRate, 999);
  assert.equal(res.body.name, 'Bassam Haddad');
});

test('DELETE /api/consultants/:id returns 404 for an unknown consultant', async () => {
  await request(app).delete('/api/consultants/999').expect(404);
});

test('ids are never reused after a consultant has been deleted', async () => {
  const first = await request(app)
    .post('/api/consultants')
    .send({
      name: 'Lars Ohlsson',
      email: 'lars@example.com',
      skills: ['Go'],
      hourlyRate: 1000,
      yearsOfExperience: 9,
    });

  await request(app).delete('/api/consultants/5').expect(204);

  const second = await request(app)
    .post('/api/consultants')
    .send({
      name: 'Maja Ryd',
      email: 'maja@example.com',
      skills: ['Rust'],
      hourlyRate: 1050,
      yearsOfExperience: 8,
    });

  assert.notEqual(
    second.body.id,
    first.body.id,
    'two different consultants must never share an id'
  );
});


// The seed data has 10 consultants; this page shows 3 of them.
test('GET /api/consultants returns total before pagination', async () => {
  const res = await request(app)
    .get('/api/consultants?page=1&pageSize=3')
    .expect(200);

  assert.equal(res.body.items.length, 3);
  assert.equal(res.body.total, 10);
});

// The seed data has 3 unavailable consultants; this page shows 2 of them.
test('GET /api/consultants returns filtered total before pagination', async () => {
  const res = await request(app)
    .get('/api/consultants?available=false&page=1&pageSize=2')
    .expect(200);

  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.total, 3);
});



// Sorting by rate must not change the order of later requests.
test('GET /api/consultants rate sorting does not affect later requests', async () => {
  const sorted = await request(app)
    .get('/api/consultants?sort=rate&page=1&pageSize=3')
    .expect(200);

  assert.deepEqual(
    sorted.body.items.map((c) => c.id),
    [9, 5, 7]
  );

  const subsequent = await request(app)
    .get('/api/consultants?page=1&pageSize=3')
    .expect(200);

  assert.deepEqual(
    subsequent.body.items.map((c) => c.id),
    [1, 2, 3]
  );
});