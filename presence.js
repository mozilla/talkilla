/* jshint unused:false */
var fs = require('fs');
var express = require('express');
var http = require('http');
var path = require('path');
var app = express();
/* The "browser" variable predefines for jshint include WebSocket,
 * causes jshint to blow up here.  We should probably structure things
 * differently so that the browser predefines aren't turned on
 * for the node code at some point.  In the meantime, disable warning */
/* jshint -W079 */
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

app.use(express.bodyParser());
app.use(express.static(__dirname + "/static"));
var server;

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
      config = JSON.parse(fs.readFileSync(path.join(configRoot, file)));

  if (!process.env.NO_LOCAL_CONFIG) {
    var localConfigFile = path.join(configRoot, 'local.json');
    if (fs.existsSync(localConfigFile)) {
      config = merge(config, JSON.parse(fs.readFileSync(localConfigFile)));
    }
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

function getConnection(id) {
  return app.get('connections').filter(function(ws) {
    return (ws.id === id && ws.readyState === WebSocket.OPEN);
  })[0];
}
exports.getConnection = getConnection;

/**
 * Configures a WebSocket connection. Any ws JSON message received is parsed and
 * emitted as a dedicated event. Emitted events:
 *
 * - call_offer: call offer event
 * - call_accept: call accepted event
 * - call_deny: call denied event
 * - id: ws connection authentication event
 * - incoming_call: incoming call event
 *
 * @param  {WebSocket} ws WebSocket client connection
 * @return {WebSocket}
 */
function configureWs(ws) {
  ws.on('message', function(message) {
    var events;

    try {
      events = JSON.parse(message);
    } catch (e) {
      console.error('WebSocket message error: ' + e);
    }

    if (!events || typeof events !== 'object')
      return;

    for (var type in events) {
      ws.emit(type, events[type], this);
    }
  });

  // authenticates the ws connection against a user id
  ws.on('id', function(data) {
    this.id = data;

    this.send(JSON.stringify({
      users: app.get('users')
    }));
  });

  // when a call offer has been sent
  ws.on('call_offer', function(data) {
    try {
      var calleeWs = getConnection(data.callee);
      calleeWs.send(JSON.stringify({
        'incoming_call': {
          caller: this.id,
          callee: calleeWs.id,
          offer:  data.offer
        }
      }));
    } catch (e) {console.error(e);}
  });

  // when a call offer has been accepted
  ws.on('call_accepted', function(data) {
    try {
      getConnection(data.caller).send(JSON.stringify({
        'call_accepted': data
      }));
    } catch (e) {console.error(e);}
  });

  // when a call offer has been denied
  ws.on('call_deny', function(data) {
    try {
      getConnection(data.caller).send(JSON.stringify({
        'call_denied': data
      }));
    } catch (e) {console.error(e);}
  });

  // when a connection is closed, remove it from the pool as well and update the
  // list of online users
  ws.on('close', function() {
    var connections = app.get('connections'),
        users = app.get('users'),
        closing = this.id;
    // filter the list of online users
    users = users.filter(function(user) {
      return user.nick !== closing;
    });
    // filter the list of active connections
    connections = connections.filter(function(ws) {
      return ws.readyState === WebSocket.OPEN && ws.id !== closing;
    });
    // notify all remaining connections with an updated list of online users
    connections.forEach(function(ws) {
      ws.send(JSON.stringify({users: users}));
    });
    // update collections
    app.set('connections', connections);
    app.set('users', users);
  });

  return ws;
}

var wss;
function setupWebSocketServer(callback) {
  wss = new WebSocketServer({server: server});

  wss.on('connection', function(ws) {
    // adds this new connection to the pool
    var connections = app.get('connections');
    connections.push(configureWs(ws));
    app.set('connections', connections);
  });

  wss.on('error', function(err) {
    console.log("WebSocketServer error: " + err);
  });

  wss.on('close', function(ws) {});

  if (callback)
    callback();
}

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
  server.close(function () {
    this.started = false;
    if (callback)
      callback();
  }.bind(this));
};

module.exports.app = app;
module.exports.findNewNick = findNewNick;
