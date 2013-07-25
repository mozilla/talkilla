/* jshint unused:false */
var fs = require('fs');
var express = require('express');
var http = require('http');
var path = require('path');
var logger = require('./logger');
var app = express();

app.use(express.bodyParser());
app.use(express.static(__dirname + "/../static"));
app.use(app.router);

var server = http.createServer(app);

/**
 * Merges two objects
 *
 * @param  {String} obj
 * @param  {String} other
 * @return {String}
 */
function merge(obj, other) {
  var keys = Object.keys(other);
  for (var i = 0, len = keys.length; i < len; ++i) {
    var key = keys[i];
    obj[key] = other[key];
  }
  return obj;
}
exports.merge = merge;

/**
 * Retrieves a configuration object from a JSON file.
 *
 * @param  {String} file Path to JSON configuration file
 * @return {Object}
 */
function getConfigFromFile(file) {
  var configRoot = path.join(__dirname, '..', 'config'),
      config = JSON.parse(fs.readFileSync(path.join(configRoot, file)));

  if (!process.env.NO_LOCAL_CONFIG) {
    var localConfigFile = path.join(configRoot, 'local.json');
    if (fs.existsSync(localConfigFile)) {
      logger.warn("Using local.json");
      config = merge(config, JSON.parse(fs.readFileSync(localConfigFile)));
    }
  }
  return config;
}
exports.getConfigFromFile = getConfigFromFile;

// development settings
app.configure('development', function() {
  app.set('config', getConfigFromFile('dev.json'));
  app.use('/test', express.static(__dirname + '/../test'));
});

// production settings
app.configure('production', function() {
  app.set('config', getConfigFromFile('prod.json'));
});

// test settings
app.configure('test', function() {
  app.set('config', getConfigFromFile('test.json'));
  app.use('/test', express.static(__dirname + '/../test'));
});

function uncaughtError(err, req, res, next) {
  logger.error({err: err});
  res.send(500);
}
app.use(uncaughtError);

app.get('/config.json', function(req, res) {
  res.header('Content-Type', 'application/json');
  res.send(200, JSON.stringify(app.get('config')));
});

app.start = function(serverPort, callback) {
  app.set('users', {});

  var config = app.get('config');

  // ensure compatibility with our testing environment
  if (!("WSURL" in config)) {
    config.WSURL = "ws://localhost:" + serverPort;
  }

  if (!("ROOTURL" in config)) {
    config.ROOTURL = "http://localhost:" + serverPort;
  }

  app.set('config', config);
  server.listen(serverPort, callback);
};

app.shutdown = function(callback) {
  var users = app.get('users');

  Object.keys(users).forEach(function(nick) {
    var user = users[nick];
    if (user.ws)
      user.ws.close();
  });

  server.close(callback);
};

module.exports.app = app;
module.exports.server = server;
