/* jshint unused:false */
var fs = require('fs');
var url = require('url');
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
      console.log("Warning: using local.json");
      config = merge(config, JSON.parse(fs.readFileSync(localConfigFile)));
    }
  }
  return config;
}
exports.getConfigFromFile = getConfigFromFile;

// development settings
app.configure('development', function() {
  app.set('config', getConfigFromFile('dev.json'));
  app.use('/test', express.static(__dirname + '/test'));
});

// production settings
app.configure('production', function() {
  app.set('config', getConfigFromFile('prod.json'));
});

// test settings
app.configure('test', function() {
  app.set('config', getConfigFromFile('test.json'));
  app.use('/test', express.static(__dirname + '/test'));
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

// Utility function to help us respect the interface expected by the
// frontend.
// XXX: In the future, this function should either disappear or grow
// to provide more information than the nickname.
function _usersToArray(users) {
  return Object.keys(users).map(function(nick) {
    return {nick: nick};
  });
}

function _presentUsers(users) {
  return Object.keys(users)
    .filter(function(nick) {
      return !!users[nick].ws;
    }).map(function(nick) {
      return {nick: nick};
    });
}

app.get('/config.json', function(req, res) {
  res.header('Content-Type', 'application/json');
  res.send(200, JSON.stringify(app.get('config')));
});

app.post('/signin', function(req, res) {
  var users = app.get('users');
  var usersList = _usersToArray(users);
  var nick = req.body.nick;

  function exists(nick) {
    return usersList.some(function(user) {
      return user.nick === nick;
    });
  }

  while (exists(nick))
    nick = findNewNick(nick);

  users[nick] = {};
  app.set('users', users);

  res.send(200, JSON.stringify({nick: nick}));
});

app.post('/signout', function(req, res) {
  var users = app.get('users');

  delete users[req.body.nick];
  app.set('users', users);

  res.send(200, JSON.stringify(true));
});

/**
 * Configures a WebSocket connection. Any ws JSON message received is parsed and
 * emitted as a dedicated event. Emitted events:
 *
 * - call_offer: call offer event
 * - call_accept: call accepted event
 * - call_deny: call denied event
 * - call_hangup: call hung up event
 * - incoming_call: incoming call event
 *
 * @param  {WebSocket} ws WebSocket client connection
 * @return {WebSocket}
 */
function configureWs(ws, nick) {
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

  /**
   * Handles a received call_offer message. It will send an
   * incoming_call message to the user specified by data.peer.
   *
   * call_offer parameters:
   *
   * - peer    the id of the user to call. This will be replaced
   *           by the id of the user making the call.
   * - offer   the sdp offer for the connection
   */
  ws.on('call_offer', function(data) {
    try {
      var users = app.get('users');
      var peer = users[data.peer];
      data.peer = nick;
      peer.ws.send(JSON.stringify({'incoming_call': data}));
    } catch (e) {console.error('call_offer', e);}
  });

  /**
   * Handles a received call_accepted message. It will send an
   * call_accepted message to the user specified by data.peer.
   *
   * call_accepted parameters:
   *
   * - peer   the id of the user who initiated the call. This will be
   *           replaced by the id of the user receiving the call.
   * - offer   the sdp offer for the connection
   */
  ws.on('call_accepted', function(data) {
    try {
      var users = app.get('users');
      var peer = users[data.peer];
      data.peer = nick;
      peer.ws.send(JSON.stringify({'call_accepted': data}));
    } catch (e) {console.error('call_accept', e);}
  });

  // when a call offer has been denied
  ws.on('call_deny', function(data) {
    try {
      var users = app.get('users');
      var caller = users[data.caller];
      caller.ws.send(JSON.stringify({'call_denied': data}));
    } catch (e) {console.error('call_deny', e);}
  });

  /**
   * When a call is hung up.
   *
   * data is expected to contain
   * - peer: id of the peer user for which the call should be hung up.
   *
   * The 'peer' value will be translated to the id of the sender.
   */
  ws.on('call_hangup', function(data) {
    try {
      var users = app.get('users');
      var peer = users[data.peer];
      peer.ws.send(JSON.stringify({'call_hangup': {peer: nick}}));
    } catch (e) {console.error('call_hangup', e);}
  });

  // when a connection is closed, remove it from the pool as well and update the
  // list of online users
  ws.on('close', function() {
    var users = app.get('users');

    Object.keys(users).forEach(function(nick) {
      var user = users[nick];
      if (user.ws === ws)
        delete user.ws;
    });

    Object.keys(users).forEach(function(nick) {
      var user = users[nick];
      if (user.ws)
        user.ws.send(JSON.stringify({users: _presentUsers(users)}),
                     function(error) {});
    });

    app.set('users', users);
  });

  return ws;
}

function httpUpgradeHandler(req, socket, upgradeHead) {
  var users = app.get('users');
  var nick = url.parse(req.url, true).query.nick;
  var res = new http.ServerResponse(req);

  // XXX: need a test for that
  if (!(nick in users)) {
    res.assignSocket(socket);
    res.statusCode = 400;
    res.end();
    return;
  }

  module.exports._wss.handleUpgrade(req, socket, upgradeHead, function(ws) {
    // attach the WebSocket to the user
    // XXX: The user could be signed out at this point
    var users = app.get('users');
    users[nick].ws = configureWs(ws, nick);
    app.set('users', users);

    Object.keys(users).forEach(function(nick) {
      var user = users[nick];
      if (user.ws)
        user.ws.send(JSON.stringify({users: _presentUsers(users)}));
    });
  });
}

function _createWebSocketServer() {
  module.exports._wss = new WebSocketServer({noServer: true});
}

function _destroyWebSocketServer() {
  module.exports._wss.removeAllListeners();
  module.exports._wss.close();
}

function _configureWebSocketServer(httpServer, httpUpgradeHandler, callback) {
  httpServer.on('upgrade', httpUpgradeHandler);

  module.exports._wss.on('error', function(err) {
    console.log("WebSocketServer error: " + err);
  });

  module.exports._wss.on('close', function(ws) {});

  if (callback)
    callback();
}

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

  console.log("listening on " + serverPort);

  server = http.createServer(this);
  _createWebSocketServer();
  server.listen(serverPort,
    _configureWebSocketServer.bind(this, server, httpUpgradeHandler, callback));
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
module.exports.findNewNick = findNewNick;
module.exports._usersToArray = _usersToArray;
module.exports._presentUsers = _presentUsers;
module.exports._configureWebSocketServer = _configureWebSocketServer;
module.exports._createWebSocketServer = _createWebSocketServer;
module.exports._destroyWebSocketServer = _destroyWebSocketServer;

