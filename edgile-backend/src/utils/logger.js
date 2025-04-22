const winston = require('winston');
const path = require('path');

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

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Determine log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  level,
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    
    // Combined logs file transport
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
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