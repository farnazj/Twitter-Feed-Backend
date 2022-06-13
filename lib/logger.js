const winston = require("winston");
require('winston-daily-rotate-file');
var path = require('path');
require('dotenv').config({ path: path.join(__dirname,'/../.env') });

const level = process.env.LOG_LEVEL || 'debug';

const logFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.align(),
  winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
  );

var errorTransport = new (winston.transports.DailyRotateFile)({
  filename: 'winston/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  prepend: true
});

var combinedTransport = new (winston.transports.DailyRotateFile)({
  filename: 'winston/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD-HH',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: level,
  prepend: true
});


const customLevels = {
  levels: {
    error: 0,
    warn: 1, 
    info: 2, 
    http: 3,
    verbose: 4, 
    debug: 5, 
    silly: 6
  },
  colors: {
    error: 'red',
    warn: 'yellow', 
    info: 'blue', 
    http: 'green',
    verbose: 'gray', 
    debug: 'magenta', 
    silly: 'black'
  }
};
 

const logger = winston.createLogger({
  levels: customLevels.levels,
  format: logFormat,
  transports: [
    errorTransport,
    combinedTransport
  ]
});

winston.addColors(customLevels.colors);

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;