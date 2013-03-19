var express = require('express');
var server = express();

server.use(express.bodyParser());
server.use(express.static(__dirname + "/static"));

server.post('/signin', function(req, res) {
  var users = server.get('users');
  users.push(req.body.nick);
  server.set('users', users);
  res.send(200);
});

server.post('/signout', function(req, res) {
  var users = server.get('users');
  var pos = users.indexOf(req.body.nick);
  if (pos == -1)
    res.send(404, 'User not logged in');

  users.pop(pos);
  server.set('users', users);

  res.send(200);
});

var _listen = server.listen;
server.listen = function() {
  server.set('users', []);
  return _listen.apply(server, arguments);
}

module.exports.server = server;

