var config = require('./config').config;
var bunyan = require('bunyan');

// Logging
var logger = bunyan.createLogger({
  name: 'talkilla',
  level: config.LOG_LEVEL,
  serializers: {err: bunyan.stdSerializers.err}
});

module.exports = logger;
