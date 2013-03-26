var express = require('express');
var server = express();

server.use(express.bodyParser());
server.use(express.static(__dirname + "/static"));

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

server.get('/users', function(req, res) {
  res.send(200, JSON.stringify(server.get('users')));
});

server.post('/signin', function(req, res) {
  var users = server.get('users');
  var nick = req.body.nick;
  function exists(nick) {
    return users.some(function(user) {
      return user.nick === nick;
    });
  }
  while (exists(nick))
    nick = findNewNick(nick);
  users.push({nick: nick});
  server.set('users', users);
  res.send(200, JSON.stringify({nick: nick, users: users}));
});

server.post('/signout', function(req, res) {
  server.set('users', server.get('users').filter(function(user) {
    return user.nick !== req.body.nick;
  }));
  res.send(200, JSON.stringify(true));
});

var _listen = server.listen;
server.listen = function() {
  server.set('users', []);
  return _listen.apply(server, arguments);
};

module.exports.server = server;
module.exports.findNewNick = findNewNick;
