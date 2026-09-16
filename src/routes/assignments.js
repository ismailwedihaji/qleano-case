'use strict';

const express = require('express');
const store = require('../data/store');
const { ValidationError, NotFoundError, ConflictError } = require('../errors');

const router = express.Router();

// GET /api/assignments?consultantId=1
router.get('/', async (req, res) => {
  const all = await store.getAssignments();

  const items =
    req.query.consultantId === undefined
      ? all
      : all.filter((assignment) => assignment.consultantId === Number(req.query.consultantId));

  res.json({ items, total: items.length });
});

// POST /api/assignments
// A consultant must never hold two assignments that overlap in time.
router.post('/', async (req, res) => {
  const { consultantId, title, startDate, endDate } = req.body ?? {};

  if (!title) {
    throw new ValidationError('title is required');
  }
  if (!startDate || !endDate) {
    throw new ValidationError('startDate and endDate are required');
  }

  const consultant = await store.findConsultant(consultantId);
  if (!consultant) {
    throw new NotFoundError(`No consultant with id ${consultantId}`);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  const existing = await store.getAssignments();
  const clash = existing
    .filter((assignment) => assignment.consultantId === consultant.id)
    .find((assignment) => {
      const bookedStart = new Date(assignment.startDate);
      const bookedEnd = new Date(assignment.endDate);
      return start <= bookedEnd && end >= bookedStart;
    });

  if (clash) {
    throw new ConflictError(
      `${consultant.name} is already booked ${clash.startDate} - ${clash.endDate}`
    );
  }

  const created = await store.createAssignment({
    consultantId: consultant.id,
    title,
    startDate,
    endDate,
  });

  res.status(201).json(created);
});

module.exports = router;
