/* jshint unused:false */
var http = require('http');
var https = require('https');
var url = require('url');
var app = require("./server").app;
var httpServer = require("./server").server;
var config = require('./config').config;
var logger = require('./logger');
var Users = require('./users').Users;
var User = require('./users').User;

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({noServer: true});
var users = new Users();
var api;

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

/**
 * Configures a WebSocket connection.
 *
 * @param  {WebSocket} ws WebSocket client connection
 * @return {WebSocket}
 */
function configureWs(ws, nick) {
  ws.on("message", api.ws.onMessage.bind(ws, nick));
  ws.on("close", api.ws.onClose.bind(ws, nick));

  ws.on("call_offer", api.ws.onCallOffer);
  ws.on("call_accepted", api.ws.onCallAccepted);
  ws.on("call_hangup", api.ws.onCallHangup);

  ws.on("presence_request", api.ws.onPresenceRequest);

  logger.info({type: "connection"});
  return ws;
}

api = {
  _verifyAssertion: function(assertion, callback) {
    var data = "audience=" + encodeURIComponent(config.ROOTURL);
    data += "&assertion=" + encodeURIComponent(assertion);

    var options = {
      host: "verifier.login.persona.org",
      path: "/verify",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": data.length
      }
    };

    var req = https.request(options, function (res) {
      var ret = "";
      res.setEncoding('utf8');

      res.on("data", function (chunk) {
        ret += chunk;
      });
      res.on("end", function () {
        var val = JSON.parse(ret);
        if (val.status === "okay")
          callback(null, val.email);
        else
          callback(val.reason);
      });
    });
    req.write(data);
    req.end();
  },

  signin: function(req, res) {
    var assertion = req.body.assertion;
    api._verifyAssertion(assertion, function(err, nick) {
      if (err)
        return res.send(400, JSON.stringify({error: err}));

      users.add(nick);
      logger.info({type: "signin"});
      res.send(200, JSON.stringify(users.get(nick)));
    });
  },

  signout: function(req, res) {
    var nick = req.body.nick;
    users.get(nick).disconnect();
    users.remove(nick);
    logger.info({type: "signout"});
    res.send(200, JSON.stringify(true));
  },

  ws: {
    /**
     * Any ws JSON message received is parsed and emitted as a
     * dedicated event. Emitted events:
     *
     * - call_offer: call offer event
     * - call_accepted: call accepted event
     * - call_hangup: call hung up event
     *
     * @param  {WebSocket} ws WebSocket client connection
     * @return {WebSocket}
     */
    onMessage: function(nick, message) {
      var events;

      try {
        events = JSON.parse(message);
      } catch (e) {
        logger.error({type: "websocket", err: e});
      }

      // XXX: should we have an error if events is not an object?
      if (!events || typeof events !== 'object')
        return;

      for (var type in events) {
        this.emit(type, events[type], nick);
      }
    },

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
    onCallOffer: function(data, nick) {
      var peer = users.get(data.peer);
      data.peer = nick;
      peer.send({'incoming_call': data});
      logger.info({type: "call:offer"});
    },

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
    onCallAccepted: function(data, nick) {
      var peer = users.get(data.peer);
      data.peer = nick;
      peer.send({'call_accepted': data});
      logger.info({type: "call:accepted"});
    },

    /**
     * When a call is hung up.
     *
     * data is expected to contain
     * - peer: id of the peer user for which the call should be hung up.
     *
     * The 'peer' value will be translated to the id of the sender.
     */
    onCallHangup: function(data, nick) {
      var peer = users.get(data.peer);
      peer.send({'call_hangup': {peer: nick}});
      logger.info({type: "call:hangup"});
    },

    /**
     * Called when the client requests for the current presence state.
     * It returns a list of current users connected to the server
     * (aka. present).
     *
     * data is empty
     */
    onPresenceRequest: function(data, nick) {
      var user = users.get(nick);
      var presentUsers = users.toJSON(users.present());
      user.send({users: presentUsers});
    },

    // when a connection is closed, remove it from the pool as well
    // and update the list of online users
    onClose: function(nick) {
      var user = users.get(nick);

      if (user)
        user.disconnect();

      users.present().forEach(function(user) {
        user.send({userLeft: nick}, function() {});
      });

      logger.info({type: "disconnection"});
    }
  },

  upgrade: function(req, socket, upgradeHead) {
    var nick = url.parse(req.url, true).query.nick;
    var res = new http.ServerResponse(req);

    if (!(users.hasNick(nick))) {
      res.assignSocket(socket);
      res.statusCode = 400;
      res.end();
      return;
    }

    var callback = api.onWebSocket.bind(this, nick);
    wss.handleUpgrade(req, socket, upgradeHead, callback);
  },

  onWebSocket: function(nick, ws) {
    var presentUsers = users.present();

    // attach the WebSocket to the user
    // XXX: The user could be signed out at this point
    users.get(nick).connect(configureWs(ws, nick));

    presentUsers.forEach(function(user) {
      user.send({userJoined: nick}, function(error) {});
    });
  }
};

app.post('/signin', api.signin);
app.post('/signout', api.signout);

httpServer.on('upgrade', api.upgrade);
wss.on('error', function(err) {
  logger.error({type: "websocket", err: err});
});
wss.on('close', function(ws) {});


module.exports.findNewNick = findNewNick;
module.exports.configureWs = configureWs;
module.exports.api = api;
module.exports._users = users;
module.exports._wss = wss;
