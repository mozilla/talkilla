/* jshint unused:false */
var http = require('http');
var url = require('url');
var app = require("./server").app;
var httpServer = require("./server").server;
var logger = require('./logger');
var Users = require('./users').Users;
var User = require('./users').User;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({noServer: true});
var users = new Users();

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
  var nick = req.body.nick;

  while (users.hasNick(nick))
    nick = findNewNick(nick);

  users.add(nick);
  logger.info({type: "signin"});
  res.send(200, JSON.stringify(users.get(nick)));
});

app.post('/signout', function(req, res) {
  var nick = req.body.nick;
  users.get(nick).disconnect();
  users.remove(nick);
  logger.info({type: "signout"});
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
      logger.error({type: "websocket", err: e});
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
      var peer = users.get(data.peer);
      data.peer = nick;
      peer.send({'incoming_call': data});
      logger.info({type: "call:offer"});
    } catch (e) {
      logger.error({type: "call:offer", err: e});
    }
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
      var peer = users.get(data.peer);
      data.peer = nick;
      peer.send({'call_accepted': data});
      logger.info({type: "call:accept"});
    } catch (e) {
      logger.error({type: "call:accept", err: e});
    }
  });

  // when a call offer has been denied
  ws.on('call_deny', function(data) {
    try {
      var caller = users.get(data.caller);
      caller.send({'call_denied': data});
      logger.info({type: "call:deny"});
    } catch (e) {
      logger.error({type: "call:deny", err: e});
    }
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
      var peer = users.get(data.peer);
      peer.send({'call_hangup': {peer: nick}});
      logger.info({type: "call:hangup"});
    } catch (e) {
      logger.error({type: "call:hangup", err: e});
    }
  });

  // when a connection is closed, remove it from the pool as well and update the
  // list of online users
  ws.on('close', function() {
    var presentUsers;
    var user = users.get(nick);

    if (user)
      user.disconnect();

    presentUsers = users.toJSON(users.present());
    users.present().forEach(function(user) {
      user.send({users: presentUsers}, function() {});
    });

    logger.info({type: "disconnection"});
  });

  logger.info({type: "connection"});
  return ws;
}

httpServer.on('upgrade', function(req, socket, upgradeHead) {
  var nick = url.parse(req.url, true).query.nick;
  var res = new http.ServerResponse(req);

  // XXX: need a test for that
  if (!(users.hasNick(nick))) {
    res.assignSocket(socket);
    res.statusCode = 400;
    res.end();
    return;
  }

  wss.handleUpgrade(req, socket, upgradeHead, function(ws) {
    var presentUsers;

    // attach the WebSocket to the user
    // XXX: The user could be signed out at this point
    users.get(nick).connect(configureWs(ws, nick));

    presentUsers = users.toJSON(users.present());
    users.present().forEach(function(user) {
      user.send({users: presentUsers}, function(error) {});
    });
  });
});

wss.on('error', function(err) {
  logger.error({type: "websocket", err: err});
});
wss.on('close', function(ws) {});


module.exports.findNewNick = findNewNick;
