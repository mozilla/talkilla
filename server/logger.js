var bunyan = require('bunyan');

// Logging
var logger = bunyan.createLogger({
  name: 'talkilla',
  level: "error", // XXX: should use app.get("config")
  serializers: {err: bunyan.stdSerializers.err}
});

module.exports = logger;

