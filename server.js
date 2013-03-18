var express = require('express');
var server = express();

var users = [];
server.set('users', users);

module.exports.server = server;

