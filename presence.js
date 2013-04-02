var express = require('express');
var app = express();

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
});

app.post('/signout', function(req, res) {
  app.set('users', app.get('users').filter(function(user) {
    return user.nick !== req.body.nick;
  }));
  res.send(200, JSON.stringify(true));
});

var _listen = app.listen;
app.listen = function() {
  app.set('users', []);
  return _listen.apply(app, arguments);
};

module.exports.app = app;
module.exports.findNewNick = findNewNick;
