'use strict';

const { ValidationError } = require('../errors');

// This module fakes a database: everything lives in memory, but every method
// is async with a little latency so the calling code behaves like it would
// against a real database.

const SEED_CONSULTANTS = [
  { id: 1, name: 'Anna Lindqvist', email: 'anna@example.com', skills: ['Node.js', 'PostgreSQL'], hourlyRate: 950, yearsOfExperience: 8, available: true },
  { id: 2, name: 'Bassam Haddad', email: 'bassam@example.com', skills: ['React', 'TypeScript'], hourlyRate: 890, yearsOfExperience: 5, available: true },
  { id: 3, name: 'Cecilia Nord', email: 'cecilia@example.com', skills: ['Node.js', 'AWS', 'Terraform'], hourlyRate: 1150, yearsOfExperience: 12, available: false },
  { id: 4, name: 'David Osei', email: 'david@example.com', skills: ['Java', 'Kafka'], hourlyRate: 1020, yearsOfExperience: 10, available: true },
  { id: 5, name: 'Elin Sjoberg', email: 'elin@example.com', skills: ['Node.js', 'React'], hourlyRate: 780, yearsOfExperience: 3, available: false },
  { id: 6, name: 'Farid Mohammadi', email: 'farid@example.com', skills: ['Python', 'ML'], hourlyRate: 1100, yearsOfExperience: 9, available: true },
  { id: 7, name: 'Greta Alm', email: 'greta@example.com', skills: ['C#', '.NET'], hourlyRate: 870, yearsOfExperience: 6, available: true },
  { id: 8, name: 'Hassan Yilmaz', email: 'hassan@example.com', skills: ['Go', 'Kubernetes'], hourlyRate: 1180, yearsOfExperience: 11, available: false },
  { id: 9, name: 'Ida Bergstrom', email: 'ida@example.com', skills: ['QA', 'Playwright'], hourlyRate: 720, yearsOfExperience: 4, available: true },
  { id: 10, name: 'Jonas Ek', email: 'jonas@example.com', skills: ['Node.js', 'GraphQL'], hourlyRate: 990, yearsOfExperience: 7, available: true },
];

const SEED_ASSIGNMENTS = [
  { id: 1, consultantId: 1, title: 'Order flow migration', startDate: '2026-03-01', endDate: '2026-06-30' },
  { id: 2, consultantId: 4, title: 'Kafka integration', startDate: '2026-02-01', endDate: '2026-04-15' },
];

let consultants = clone(SEED_CONSULTANTS);
let assignments = clone(SEED_ASSIGNMENTS);

let nextConsultantId = Math.max(0, ...SEED_CONSULTANTS.map(c => c.id)) + 1;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function delay(ms = 3) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseId(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) {
    throw new ValidationError(`Invalid id: ${rawId}`);
  }
  return id;
}

async function getConsultants() {
  await delay();
  return consultants;
}

async function findConsultant(rawId) {
  await delay();
  const id = parseId(rawId);
  return consultants.find((consultant) => consultant.id === id) || null;
}

async function createConsultant(data) {
  await delay();
  const consultant = { ...data, id: nextConsultantId++ };
  consultants.push(consultant);
  return consultant;
}

async function deleteConsultant(rawId) {
  await delay();
  const id = parseId(rawId);
  const index = consultants.findIndex((consultant) => consultant.id === id);
  if (index === -1) {
    return null;
  }
  const [removed] = consultants.splice(index, 1);
  return removed;
}

async function getAssignments() {
  await delay();
  return assignments;
}

async function createAssignment(data) {
  await delay();
  const assignment = { id: assignments.length + 1, ...data };
  assignments.push(assignment);
  return assignment;
}

// Used by the test suite to restore the seed data between test cases.
function __reset() {
  consultants = clone(SEED_CONSULTANTS);
  assignments = clone(SEED_ASSIGNMENTS);
  nextConsultantId = Math.max(0, ...SEED_CONSULTANTS.map(c => c.id)) + 1;
}

module.exports = {
  getConsultants,
  findConsultant,
  createConsultant,
  deleteConsultant,
  getAssignments,
  createAssignment,
  __reset,
};
