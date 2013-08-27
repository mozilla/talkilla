var bunyan = require('bunyan');

// Logging
function logger(config) {
  return bunyan.createLogger({
    name: 'talkilla',
    level: config.LOG_LEVEL,
    serializers: {err: bunyan.stdSerializers.err}
  });
}

module.exports = logger;
