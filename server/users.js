function User(nick) {
  this.nick = nick;
  this.ws = undefined;
}

User.prototype.connect = function(ws) {
  this.ws = ws;
  return this;
};

User.prototype.disconnect = function() {
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
  return this;
};

User.prototype.send = function(data, errback) {
  var message = JSON.stringify(data);
  this.ws.send(message, errback);
  return this;
};

User.prototype.toJSON = function() {
  return {nick: this.nick};
};

function Users() {
  this.users = {};
}

Users.prototype.hasNick = function(nick) {
  return Object.keys(this.users).some(function(username) {
    return username === nick;
  });
};

Users.prototype.add = function(nick) {
  this.users[nick] = new User(nick);
  return this;
};

Users.prototype.get = function(nick) {
  return this.users[nick];
};

Users.prototype.all = function() {
  return Object.keys(this.users).map(function(nick) {
    return this.users[nick];
  }.bind(this));
};

Users.prototype.remove = function(nick) {
  delete this.users[nick];
  return this;
};

Users.prototype.forEach = function(callback) {
  Object.keys(this.users).forEach(function(nick) {
    callback(this.users[nick]);
  }.bind(this));
};

Users.prototype.present = function() {
  var presentUsers = [];
  Object.keys(this.users).forEach(function(nick) {
    var user = this.users[nick];
    if (user.ws)
      presentUsers.push(user);
  }.bind(this));

  return presentUsers;
};

Users.prototype.toJSON = function(users) {
  users = users || this.all();

  return Object.keys(users).map(function(nick) {
    var user = users[nick];

    return {nick: user.nick};
  });
};

module.exports.Users = Users;
module.exports.User = User;
