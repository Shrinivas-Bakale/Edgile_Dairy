const winston = require("winston");
const path = require("path");

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
  error: "red",
  warn: "yellow",
  info: "green",
  http: "cyan",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Create a filter format
const filterFormat = winston.format((info) => {
  // Filter out common noisy messages
  if (
    info.message.includes("heartbeat") ||
    info.message.includes("connection idle") ||
    info.message.includes("socket timeout") ||
    info.message.includes("jwt expired") ||
    info.message.includes("jwt malformed") ||
    info.message.includes("invalid signature")
  ) {
    return false;
  }
  return info;
})();

// Define custom format for console output
const consoleFormat = winston.format.combine(
  filterFormat,
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    // Only include meta if it's not empty and not just an empty object
    const metaString =
      Object.keys(meta).length && JSON.stringify(meta) !== "{}"
        ? JSON.stringify(meta, null, 2)
        : "";
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  filterFormat,
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    // Only include meta if it's not empty and not just an empty object
    const metaString =
      Object.keys(meta).length && JSON.stringify(meta) !== "{}"
        ? JSON.stringify(meta, null, 2)
        : "";
    return `${timestamp} [${level}]: ${message} ${metaString}`;
  })
);

// Determine log level based on environment
const level = process.env.NODE_ENV === "production" ? "warn" : "debug";

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  level,
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // Error file transport - only in production
    ...(process.env.NODE_ENV === "production"
      ? [
          new winston.transports.File({
            filename: path.join("logs", "error.log"),
            level: "error",
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 3,
            tailable: true,
          }),
        ]
      : []),
  ],
  // Don't exit on error
  exitOnError: false,
});

// Export the logger
module.exports = logger;
