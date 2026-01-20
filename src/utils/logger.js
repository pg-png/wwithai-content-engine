/**
 * Structured logging for WWITHai Content Engine
 * Uses Winston for production-grade logging
 */

const winston = require('winston');
const { config } = require('./config');

// Custom format for console output
const consoleFormat = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const emoji = {
    error: '❌',
    warn: '⚠️',
    info: '📢',
    debug: '🔍',
  }[level] || '📝';

  let output = `${emoji} [${timestamp}] ${level.toUpperCase()}: ${message}`;

  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    output += ` ${JSON.stringify(meta)}`;
  }

  return output;
});

// Create the logger
const logger = winston.createLogger({
  level: config.DEBUG ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true })
  ),
  transports: [
    // Console transport with colors
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
      )
    }),
  ],
});

// File transport disabled for Railway/cloud deployment
// Console logging is sufficient for cloud environments

/**
 * Log user action with context
 */
function logUserAction(userId, action, details = {}) {
  logger.info(`User action: ${action}`, {
    userId,
    action,
    ...details
  });
}

/**
 * Log API call with timing
 */
function logApiCall(service, endpoint, durationMs, success = true) {
  const level = success ? 'info' : 'error';
  logger[level](`API call to ${service}`, {
    service,
    endpoint,
    durationMs,
    success
  });
}

/**
 * Log processing step progress
 */
function logProgress(userId, step, status) {
  const emoji = {
    started: '🚀',
    completed: '✅',
    failed: '❌',
    waiting: '⏳'
  }[status] || '📍';

  logger.info(`${emoji} [User ${userId}] ${step}: ${status}`);
}

module.exports = {
  logger,
  logUserAction,
  logApiCall,
  logProgress
};
