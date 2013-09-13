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
      users.get(nick).ondisconnect = function() {
        users.present().forEach(function(user) {
          user.send({userLeft: nick});
        });
        logger.info({type: "disconnection"});
      };
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

  stream: function(req, res) {
    var nick = req.body.nick;
    var user = users.get(nick);
    if (!user)
      return res.send(400, JSON.stringify({}));

    // Send the initial present users list
    if (!user.present()) {
      var presentUsers = users.present();
      var userList = users.toJSON(presentUsers);
      user.send({users: presentUsers});
      presentUsers.forEach(function(user) {
        user.send({userJoined: nick});
      });
      logger.info({type: "connection"});
    }

    user.touch().waitForEvents(function(events) {
      res.send(200, JSON.stringify(events));
    });
  },

  callOffer: function(req, res) {
    var nick = req.body.nick;
    var data = JSON.parse(req.body.data);
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward offer to unknown peer");
      return res.send(200, JSON.stringify({}));
    }

    data.peer = nick;
    peer.send({'incoming_call': data});
    logger.info({type: "call:offer"});
  },

  callAccepted: function(req, res) {
    var nick = req.body.nick;
    var data = JSON.parse(req.body.data);
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward offer to unknown peer");
      return res.send(200, JSON.stringify({}));
    }

    data.peer = nick;
    peer.send({'call_accepted': data});
    logger.info({type: "call:accepted"});
  },

  callHangup: function(req, res) {
    var nick = req.body.nick;
    var data = JSON.parse(req.body.data);
    var peer = users.get(data.peer);

    if (!peer) {
      // XXX This could happen in the case of the user disconnecting
      // just as we call them. We may want to send something back to the
      // caller to indicate the issue.
      logger.warn("Could not forward offer to unknown peer");
      return res.send(200, JSON.stringify({}));
    }

    data.peer = nick;
    peer.send({'call_hangup': data});
    logger.info({type: "call:hangup"});
  },

  presenceRequest: function(req, res) {
    var user = users.get(req.body.nick);
    var presentUsers = users.toJSON(users.present());
    res.send(200, JSON.stringify({users: presentUsers}));
  }
};

app.post('/signin', api.signin);
app.post('/signout', api.signout);
app.post('/stream', api.stream);
app.post('/calloffer', api.callOffer);
app.post('/callaccepted', api.callAccepted);
app.post('/callhangup', api.callHangup);
app.post('/presenceRequest', api.presenceRequest);

module.exports.findNewNick = findNewNick;
module.exports.api = api;
module.exports._users = users;
