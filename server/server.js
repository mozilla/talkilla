/* jshint unused:false */
var express = require('express');
var http = require('http');
var config = require('./config').config;
var logger = require('./logger');
var app = express();

app.use(express.bodyParser());
app.use(express.static(__dirname + "/../static"));
app.use(app.router);

var server = http.createServer(app);

// development settings
app.configure('development', function() {
  app.set('config', config);
  app.use('/test', express.static(__dirname + '/../test'));
});

// production settings
app.configure('production', function() {
  app.set('config', config);
});

// test settings
app.configure('test', function() {
  app.set('config', config);
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
  server.close(callback);
};

module.exports.app = app;
module.exports.server = server;
