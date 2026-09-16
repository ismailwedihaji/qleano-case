'use strict';

const express = require('express');
const consultantsRouter = require('./routes/consultants');
const assignmentsRouter = require('./routes/assignments');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./logger');

function createApp() {
  const app = express();

  app.use(express.json());

  // Every request gets an id and a req.log child logger.
  app.use(requestLogger);

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  app.use('/api/consultants', consultantsRouter);
  app.use('/api/assignments', assignmentsRouter);

  app.use(notFoundHandler);

  return app;
}

module.exports = { createApp };
