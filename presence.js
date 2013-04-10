/* jshint unused:false */
var fs = require('fs');
var express = require('express');
var http = require('http');
var path = require('path');
var app = express();
var WebSocketServer = require('ws').Server;

app.use(express.bodyParser());
app.use(express.static(__dirname + "/static"));

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
  var configRoot = path.join(__dirname, 'config'),
      config = JSON.parse(fs.readFileSync(path.join(configRoot, file))),
      localConfigFile = path.join(configRoot, 'local.json');
  if (fs.existsSync(localConfigFile)) {
    config = merge(config, JSON.parse(fs.readFileSync(localConfigFile)));
  }
  return config;
}
exports.getConfigFromFile = getConfigFromFile;

// development settings
app.configure('development', function() {
  app.set('config', getConfigFromFile('dev.json'));
});

// production settings
app.configure('production', function() {
  app.set('config', getConfigFromFile('prod.json'));
});

function findNewNick(aNick) {
  var nickParts = /^(.+?)(\d*)$/.exec(aNick);

  // If there was not a digit at the end of the nick, just append 1.
  var newDigits = "1";
  // If there was a digit at the end of the nick, increment it.
  if (nickParts[2]) {
    newDigits = (parseInt(nickParts[2], 10) + 1).toString();
    // If there were leading 0s, add them back on, after we've incremented (e.g.
    // 009 --> 010).
    for (var len = nickParts[2].length - newDigits.length; len > 0; --len)
      newDigits = "0" + newDigits;
  }

  return nickParts[1] + newDigits;
}

app.get('/config.json', function(req, res) {
  res.header('Content-Type', 'application/json');
  res.send(200, JSON.stringify(app.get('config')));
});

app.post('/signin', function(req, res) {
  var users = app.get('users');
  var nick = req.body.nick;

  function exists(nick) {
    return users.some(function(user) {
      return user.nick === nick;
    });
  }

  while (exists(nick))
    nick = findNewNick(nick);

  users.push({nick: nick});
  app.set('users', users);

  app.get('connections').forEach(function(c) {
    c.send(JSON.stringify({users: users}), function(error) {});
  });

  res.send(200, JSON.stringify({nick: nick}));
});

app.post('/signout', function(req, res) {
  var users = app.get('users').filter(function(user) {
    return user.nick !== req.body.nick;
  });
  app.set('users', users);

  app.get('connections').forEach(function(c) {
    c.send(JSON.stringify({users: users}), function(error) {});
  });

  res.send(200, JSON.stringify(true));
});

var wss;
function setupWebSocketServer(server) {
  wss = new WebSocketServer({server: server});
  wss.on('connection', function(ws) {
    // adds this new connection to the pool
    var connections = app.get('connections');
    connections.push(ws);
    app.set('connections', connections);
  });

  wss.on('error', function(err) {
    console.log("WebSocketServer error: " + err);
  });

  wss.on('close', function(ws) {
  });
}

app.start = function() {
  app.set('users', []);
  app.set('connections', []);
  var server = http.createServer(this);
  setupWebSocketServer(server);
  return server.listen.apply(server, arguments);
};

app.shutdown = function(connection) {
  app.get('connections').forEach(function(c) {
    c.close();
  });
  connection.close();
};

module.exports.app = app;
module.exports.findNewNick = findNewNick;
