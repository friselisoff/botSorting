const winston = require('winston')

// https://stackoverflow.com/a/44291208/5299903
const leadingZero = (num) => `0${num}`.slice(-2)
const formatTime = (date) =>
  [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map(leadingZero)
    .join(':')

const format = winston.format.printf(({ level, message }) => {
  return `[${formatTime(new Date())} ${level.toUpperCase()}]: ${message}`
})

const logger = winston.createLogger({
  level: 'info',
  format: format,
  transports: [
    new winston.transports.File({ filename: 'output.log' }),
    new winston.transports.Console()
  ]
})

module.exports = logger
