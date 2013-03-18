var express = require('express');
var server = express();

var users = [];
server.set('users', users);
server.use(express.bodyParser());

server.post('/signin', function(req, res) {
  users.push(req.body.nick);
  res.send(200);
});

module.exports.server = server;

