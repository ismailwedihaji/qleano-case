'use strict';

const { logger } = require('../logger');

// Translates our own error types into JSON responses with the right status code.
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const log = req.log ?? logger;

  if (status >= 500) {
    // Unexpected: keep the full stack in the log, never in the response.
    log.error(`${req.method} ${req.originalUrl} failed`, { status, err });
  } else {
    // Expected: a client mistake. Debug level so it is there when you look
    // for it, without drowning the normal output.
    log.debug(`${req.method} ${req.originalUrl} rejected`, {
      status,
      code: err.name,
      reason: err.message,
    });
  }

  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : err.message,
    code: err.name || 'Error',
  });
}

function notFoundHandler(req, res) {
  (req.log ?? logger).debug(`No route matched ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    error: `Unknown route: ${req.method} ${req.originalUrl}`,
    code: 'NotFoundError',
  });
}

module.exports = { errorHandler, notFoundHandler };
