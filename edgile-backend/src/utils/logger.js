const winston = require('winston');

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  debug: 'white',
};

// Add colors to winston
winston.addColors(colors);

// Define custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Determine log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger with only console transport
const logger = winston.createLogger({
  levels: logLevels,
  level,
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: consoleFormat,
    })
  ],
  // Don't exit on error
  exitOnError: false,
});

// Filter out noisy logs in production
if (process.env.NODE_ENV === 'production') {
  logger.filters.push((level, msg, meta) => {
    // Filter out certain debug messages that clutter the logs
    if (level === 'debug' && (
      msg.includes('heartbeat') || 
      msg.includes('connection idle') ||
      msg.includes('socket timeout')
    )) {
      return false;
    }
    return true;
  });
}

// Export the logger
module.exports = logger;