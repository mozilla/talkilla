function Users() {
  this.users = {};
}

Users.prototype.hasNick = function(nick) {
  return Object.keys(this.users).some(function(username) {
    return username === nick;
  });
};

Users.prototype.add = function(nick) {
  this.users[nick] = {nick: nick};
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

Users.prototype.connect = function(nick, websocket) {
  this.users[nick].ws = websocket;
  return this;
};

Users.prototype.disconnect = function(nick) {
  var user = this.users[nick];

  if (user) {
    user.ws.close();
    delete user.ws;
  }

  return this;
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

module.exports = Users;
