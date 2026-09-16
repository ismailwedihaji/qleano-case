'use strict';

const { createApp } = require('./app');
const { logger, logFile } = require('./logger');

const port = Number(process.env.PORT ?? 3000);

const server = createApp().listen(port, () => {
  logger.info(`Qleano case API listening on http://localhost:${port}`, {
    port,
    logLevel: logger.level,
    logFile: logFile ?? 'off',
    pid: process.pid,
  });
});

// Nothing should ever die silently while you are debugging.
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled promise rejection', { err });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err });
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(() => process.exit(0));
  });
}
