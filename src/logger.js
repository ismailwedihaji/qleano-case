'use strict';

const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util');
const crypto = require('node:crypto');

// A tiny zero-dependency logger. It is deliberately small: readable output
// while you debug, structured JSON when you want to grep it.
//
// Configure it with environment variables (see README):
//   LOG_LEVEL=debug|info|warn|error|silent   default: debug (silent under tests)
//   LOG_FORMAT=pretty|json                   default: pretty
//   LOG_FILE=logs/app.log                    default: logs/app.log (off in tests)
//   LOG_BODY=true                            also log request bodies
//   NO_COLOR=1                               disable ANSI colours

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

const COLORS = {
  debug: '\u001b[90m', // grey
  info: '\u001b[36m', // cyan
  warn: '\u001b[33m', // yellow
  error: '\u001b[31m', // red
  dim: '\u001b[2m',
  reset: '\u001b[0m',
};

// `node --test` should not spam the terminal with request logs. The test
// runner marks its child processes with NODE_TEST_CONTEXT.
const isTestRun =
  process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

function resolveLevel() {
  const configured = String(process.env.LOG_LEVEL ?? '').toLowerCase();
  if (configured in LEVELS) {
    return configured;
  }
  return isTestRun ? 'silent' : 'debug';
}

const level = resolveLevel();
const threshold = LEVELS[level];
const format = process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty';
const useColor =
  format === 'pretty' && !process.env.NO_COLOR && Boolean(process.stdout.isTTY);

// Fields that must never end up in a log line.
const REDACTED_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'cookie',
]);

function redact(value, depth = 0) {
  if (depth > 4 || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? '[redacted]'
      : redact(val, depth + 1);
  }
  return out;
}

// Everything is also written as JSON to logs/app.log so there is always a file
// to tail or grep. Set LOG_FILE=off to turn it off, or point it somewhere else.
// The path is resolved from the project root, not from your shell's cwd.
function resolveLogFile() {
  const configured = process.env.LOG_FILE ?? (isTestRun ? 'off' : 'logs/app.log');
  if (!configured || configured === 'off' || configured === 'false') {
    return null;
  }
  return path.resolve(__dirname, '..', configured);
}

const logFile = resolveLogFile();

let fileStream = null;
let lastExistsCheck = 0;

function getFileStream() {
  if (!logFile) {
    return null;
  }
  // If someone deletes or rotates the log file while the server is running,
  // an already-open stream keeps writing into nothing. Re-check now and then
  // and reopen, so the file always reappears instead of going silent.
  const now = Date.now();
  if (fileStream && now - lastExistsCheck < 1000) {
    return fileStream;
  }
  lastExistsCheck = now;
  if (fileStream && fs.existsSync(logFile)) {
    return fileStream;
  }
  if (fileStream) {
    fileStream.end();
  }
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fileStream = fs.createWriteStream(logFile, { flags: 'a' });
  return fileStream;
}

function serializeError(err) {
  return {
    name: err.name,
    message: err.message,
    status: err.status,
    stack: err.stack,
  };
}

function formatPretty(record) {
  const { time, level: lvl, msg, err, ...fields } = record;
  const clock = time.slice(11, 23); // HH:MM:SS.mmm
  const label = lvl.toUpperCase().padEnd(5);

  let line = useColor
    ? `${COLORS.dim}${clock}${COLORS.reset} ${COLORS[lvl]}${label}${COLORS.reset} ${msg}`
    : `${clock} ${label} ${msg}`;

  if (Object.keys(fields).length > 0) {
    line += ` ${util.inspect(fields, {
      colors: useColor,
      depth: 4,
      breakLength: Infinity,
      compact: true,
    })}`;
  }
  if (err) {
    line += `\n${err.stack ?? `${err.name}: ${err.message}`}`;
  }
  return line;
}

function write(lvl, msg, meta, bindings) {
  if (LEVELS[lvl] < threshold) {
    return;
  }

  const { err, ...rest } = meta ?? {};
  const record = {
    time: new Date().toISOString(),
    level: lvl,
    msg: String(msg),
    ...bindings,
    ...redact(rest),
    ...(err instanceof Error ? { err: serializeError(err) } : {}),
  };

  const line = format === 'json' ? JSON.stringify(record) : formatPretty(record);
  const stream = lvl === 'error' || lvl === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);

  const file = getFileStream();
  if (file) {
    // The file always gets JSON so it stays greppable with jq.
    file.write(`${JSON.stringify(record)}\n`);
  }
}

function createLogger(bindings = {}) {
  const logger = {
    level,
    file: logFile,
    // child({ requestId }) returns a logger that stamps those fields onto
    // every line, so one request can be followed through the whole stack.
    child(extra) {
      return createLogger({ ...bindings, ...extra });
    },
  };

  for (const lvl of ['debug', 'info', 'warn', 'error']) {
    logger[lvl] = (msg, meta) => write(lvl, msg, meta, bindings);
  }

  return logger;
}

const logger = createLogger();

// Express middleware: gives every request an id and a `req.log`, then logs one
// line when the response is finished.
function requestLogger(req, res, next) {
  const requestId = req.get('x-request-id') || crypto.randomUUID().slice(0, 8);
  const startedAt = process.hrtime.bigint();

  req.id = requestId;
  req.log = logger.child({ requestId });
  res.setHeader('x-request-id', requestId);

  const incoming = {};
  if (Object.keys(req.query ?? {}).length > 0) {
    incoming.query = { ...req.query };
  }
  if (process.env.LOG_BODY === 'true' && req.body && Object.keys(req.body).length > 0) {
    incoming.body = req.body;
  }
  req.log.debug(`--> ${req.method} ${req.originalUrl}`, incoming);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const lvl = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[lvl](`<-- ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
    });
  });

  next();
}

module.exports = { logger, requestLogger, createLogger, logFile, LEVELS };
