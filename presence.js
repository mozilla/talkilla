/* jshint unused:false */
var express = require('express');
var http = require('http');
var app = express();
var WebSocketServer = require('ws').Server;

app.use(express.bodyParser());
app.use(express.static(__dirname + "/static"));

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
function setupWebSocketServer(callback) {
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

  wss.on('close', function(ws) {});
  callback.call();
}

var server;
app.start = function(serverPort, callback) {
  app.set('users', []);
  app.set('connections', []);

  server = http.createServer(this);

  server.listen(serverPort, setupWebSocketServer.bind(this, callback));
};

app.shutdown = function(callback) {
  app.get('connections').forEach(function(c) {
    c.close();
  });
  server.close(callback);
};

module.exports.app = app;
module.exports.findNewNick = findNewNick;
