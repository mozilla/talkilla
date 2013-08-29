var logger = require('./logger');

/**
 * User class constructor
 *
 * @param {String} nick User's nick
 */
function User(nick) {
  this.nick = nick;
  this.ws = undefined;
}

/**
 * Attach a WebSocket to the user
 *
 * @param {WebSocket} ws The WebSocket to attach
 * @return {User} chainable
 */
User.prototype.connect = function(ws) {
  this.ws = ws;
  return this;
};

/**
 * Close and remove the WebSocket.
 *
 * @return {User} chainable
 */
User.prototype.disconnect = function() {
  if (this.ws) {
    this.ws.close();
    this.ws = undefined;
  }
  return this;
};

/**
 * Send data throught the attached WebSocket
 *
 * @param {Object} data An object to send throught the WebSocket
 * @param {Function} errback An optional error callback
 *
 * @return {User} chainable
 */
User.prototype.send = function(data, errback) {
  var message = JSON.stringify(data);
  if (this.ws)
    this.ws.send(message, errback);
  else
    logger.error({
      type: "websocket",
      err: new Error("The websocket does not exist anymore")
    });
  return this;
};

/**
 * Transform the user into a JSON structure
 *
 * @return {Object} a JSON structure
 */
User.prototype.toJSON = function() {
  return {nick: this.nick};
};

/**
 * Users class constructor
 */
function Users() {
  this.users = {};
}

/**
 * Check if the nick is already in the user list
 *
 * @param {String} nick the nick to check
 * @return {Boolean}
 */
Users.prototype.hasNick = function(nick) {
  return Object.keys(this.users).some(function(username) {
    return username === nick;
  });
};

/**
 * Add a new user to the collection with the given nick
 *
 * @param {String} nick the nick of the new user
 * @return {Users} chainable
 */
Users.prototype.add = function(nick) {
  this.users[nick] = new User(nick);
  return this;
};

/**
 * Retrieve a user in the collection via its nick
 *
 * @param {String} nick the nick of the user to find
 * @return {User}
 */
Users.prototype.get = function(nick) {
  return this.users[nick];
};

/**
 * Retrieve all the users as an array
 */
Users.prototype.all = function() {
  return Object.keys(this.users).map(function(nick) {
    return this.users[nick];
  }.bind(this));
};

/**
 * Remove a user from the collection
 *
 * @param {String} nick the nick of the user to remove
 * @return {Users} chainable
 */
Users.prototype.remove = function(nick) {
  delete this.users[nick];
  return this;
};

/**
 * Iterate on the collection
 *
 * @param {Function} callback the callback to execute for each user
 */
Users.prototype.forEach = function(callback) {
  Object.keys(this.users).forEach(function(nick) {
    callback(this.users[nick]);
  }.bind(this));
};

/**
 * Retrieve the list of connected users (i.e. having an attached WebSocket)
 * @return {Array} array of users
 */
Users.prototype.present = function() {
  var presentUsers = [];
  Object.keys(this.users).forEach(function(nick) {
    var user = this.users[nick];
    if (user.ws)
      presentUsers.push(user);
  }.bind(this));

  return presentUsers;
};

/**
 * Transform the collecton into a JSON structure
 *
 * @param {Array} users an optional list of users to process
 * @return {Object}
 */
Users.prototype.toJSON = function(users) {
  users = users || this.all();

  return Object.keys(users).map(function(nick) {
    var user = users[nick];

    return {nick: user.nick};
  });
};

module.exports.Users = Users;
module.exports.User = User;
