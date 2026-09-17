'use strict';

const express = require('express');
const store = require('../data/store');
const { ValidationError, NotFoundError } = require('../errors');

const router = express.Router();

const DEFAULT_PAGE_SIZE = 10;

// GET /api/consultants
// Filtering:  ?skill=node.js   ?available=true|false
// Sorting:    ?sort=rate
// Pagination: ?page=1&pageSize=10
router.get('/', async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? DEFAULT_PAGE_SIZE);

  // req.log is the per-request logger (see src/logger.js). Add lines like
  // this wherever you need to see what the code is actually doing.
  req.log.debug('Listing consultants', { page, pageSize, filters: req.query });

  const all = await store.getConsultants();
  let result = [...all];

  if (req.query.skill !== undefined) {
    const skill = String(req.query.skill).toLowerCase();
    result = result.filter((consultant) =>
      consultant.skills.some((s) => s.toLowerCase() === skill)
    );
  }

  if (req.query.available !== undefined) {
    const wanted = String(req.query.available).toLowerCase() === 'true';
    result = result.filter((consultant) => consultant.available === wanted);
  }

  if (req.query.sort === 'rate') {
    result.sort((a, b) => a.hourlyRate - b.hourlyRate);
  }

  const offset = (page - 1) * pageSize;
  const items = result.slice(offset, offset + pageSize);

  res.json({
    items,
    page,
    pageSize,
    total: result.length,
  });
});

// GET /api/consultants/:id
router.get('/:id', async (req, res) => {
  const consultant = await store.findConsultant(req.params.id);

  if (!consultant) {
    throw new NotFoundError(`No consultant with id ${req.params.id}`);
  }

  res.json(consultant);
});

// POST /api/consultants
router.post('/', async (req, res) => {
  const { name, email, skills, hourlyRate, yearsOfExperience, available } = req.body ?? {};

  if (!name) {
    throw new ValidationError('name is required');
  }
  if (!email || !String(email).includes('@')) {
    throw new ValidationError('email must be a valid email address');
  }
  if (!Array.isArray(skills)) {
    throw new ValidationError('skills must be an array');
  }
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    throw new ValidationError('hourlyRate is required and must be a number >= 0');
  }
  if (!Number.isFinite(yearsOfExperience) || yearsOfExperience < 0) {
    throw new ValidationError('yearsOfExperience is required and must be a number >= 0');
  }

  const created = await store.createConsultant({
    name,
    email,
    skills,
    hourlyRate,
    yearsOfExperience,
    available: available ?? true,
  });

  res.status(201).json(created);
});

// PATCH /api/consultants/:id
router.patch('/:id', async (req, res) => {
  const existing = await store.findConsultant(req.params.id);

  if (!existing) {
    throw new NotFoundError(`No consultant with id ${req.params.id}`);
  }

  Object.assign(existing, req.body);

  res.json(existing);
});

// DELETE /api/consultants/:id
router.delete('/:id', async (req, res) => {
  const removed = await store.deleteConsultant(req.params.id);

  if (!removed) {
    throw new NotFoundError(`No consultant with id ${req.params.id}`);
  }

  res.status(204).end();
});

module.exports = router;
