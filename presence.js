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

app.get('/users', function(req, res) {
  res.send(200, JSON.stringify(app.get('users')));
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
  res.send(200, JSON.stringify({nick: nick, users: users}));

  users.push({nick: nick});
  app.set('users', users);

  app.get('connections').forEach(function(c) {
    c.send(JSON.stringify(users), function(error) {});
  });
});

app.post('/signout', function(req, res) {
  var users = app.get('users').filter(function(user) {
    return user.nick !== req.body.nick;
  });
  app.set('users', users);

  res.send(200, JSON.stringify(true));

  app.get('connections').forEach(function(c) {
    c.send(JSON.stringify(users), function(error) {});
  });
});

var wss;
function setupWebSocketServer(server) {
  wss = new WebSocketServer({server: server});
  wss.on('connection', function(ws) {
    var users = app.get('users');
    var connections = app.get('connections');

    connections.push(ws);
    app.set('connections', connections);

    connections.map(function(c) {
      c.send(JSON.stringify(app.get('users')), function(error) {});
    });
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
