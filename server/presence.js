/* jshint unused:false */
"use strict";

var http = require('http');
var https = require('https');
var path = require('path');
var url = require('url');
var app = require("./server").app;
var httpServer = require("./server").server;
var config = require('./config').config;
var logger = require('./logger');
var Users = require('./users').Users;
var User = require('./users').User;

var users = new Users();
var api;

api = {
  _verifyAssertion: function(assertion, callback) {
    // When we're in the test environment, we bypass the assertion verifiction.
    // In this case, the email of the user IS the assertion.
    if (process.env.NODE_ENV === "test")
      return callback(null, assertion);

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

    var req = https.request(options, function(res) {
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

      logger.info({type: "signin"});

      req.session.email = nick;
      res.send(200, JSON.stringify({nick: nick}));
    });
  },

  signout: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;

    // Remove the user's session
    req.session.reset();

    var user = users.get(nick);
    if (user) {
      // notify the client
      user.send("disconnect", null);

      // Disconnecting the user will remove them from the users
      // list.
      user.disconnect();
    }

    logger.info({type: "signout"});
    res.send(200, JSON.stringify(true));
  },

  /*
   * Long Polling API
   *
   * This API provides a stream of event via a long polling mechanism.
   * The connection hangs for n seconds as long as there is no events.
   * If in the meantime there are incoming events, then the API returns
   * immediately with these events as a response.
   *
   * Events received between reconnections are not lost.
   */
  stream: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;
    var user = users.get(nick);

    if (!user) {
      // Send the userJoined notification before adding the user as present to
      // prevent the user receiving it's own notification.
      users.forEach(function(peer) {
        peer.send("userJoined", nick);
      });

      user = users.add(nick).get(nick);
      users.get(nick).ondisconnect = function() {
        users.remove(nick);
        users.forEach(function(peer) {
          peer.send("userLeft", nick);
        });
        logger.info({type: "disconnection"});
      };
      user.touch();

      // XXX: Here we force the first long-polling request to return
      // without a timeout. It's because we need to be connected to
      // request the presence. We should fix that on the frontend.
      res.send(200, JSON.stringify([]));
      logger.info({type: "connection"});
    } else if (req.body && req.body.firstRequest) {
      user.clearPending().touch();
      res.send(200, JSON.stringify([]));
      logger.info({type: "reconnection"});
    } else {
      user.touch().waitForEvents(function(events) {
        logger.trace({to: nick, events: events}, "long polling send");
        res.send(200, JSON.stringify(events));
      });
    }
  },

  callOffer: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;
    var data = req.body.data;
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward offer to unknown peer");
      return res.send(204);
    }

    data.peer = nick;
    peer.send("offer", data);
    logger.info({type: "call:offer"});
    res.send(204);
  },

  callAccepted: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;
    var data = req.body.data;
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward answer to unknown peer");
      return res.send(204);
    }

    data.peer = nick;
    peer.send("answer", data);
    logger.info({type: "call:accepted"});
    res.send(204);
  },

  callHangup: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;
    var data = req.body.data;
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward offer to unknown peer");
      return res.send(204);
    }

    data.peer = nick;
    peer.send("hangup", data);
    logger.info({type: "call:hangup"});
    res.send(204);
  },

  iceCandidate: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    logger.info({type: "ice:candidate"});
    var nick = req.session.email;
    var data = req.body.data;
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward iceCandidate to unknown peer");
      return res.send(204);
    }

    data.peer = nick;
    peer.send('ice:candidate', data);
    res.send(204);
  },

  presenceRequest: function(req, res) {
    if (!req.session.email)
      return res.send(400);

    var nick = req.session.email;
    var user = users.get(nick);
    var presentUsers = users.toJSON();

    user.send("users", presentUsers);
    return res.send(204);
  },

  instantShare: function(req, res) {
    res.sendfile(path.join(__dirname, "..", "static", "instant-share.html"));
  },

  instantSharePingBack: function(req, res) {
    var user = users.get(req.session.email);

    if (!user) {
      logger.error({type: "instantshare"},
        "instant-share link clicked by a user who is not logged in");
      return res.send(400);
    }

    user.send("instantshare", {peer: req.params.email});
    logger.info({type: "instantshare"});
    return res.send(200);
  }
};

app.post('/signin', api.signin);
app.post('/signout', api.signout);
app.post('/stream', api.stream);
app.post('/calloffer', api.callOffer);
app.post('/callaccepted', api.callAccepted);
app.post('/callhangup', api.callHangup);
app.post('/icecandidate', api.iceCandidate);
app.post('/presenceRequest', api.presenceRequest);
app.get('/instant-share/:email', api.instantShare);
app.post('/instant-share/:email', api.instantSharePingBack);

module.exports.api = api;
module.exports._users = users;
