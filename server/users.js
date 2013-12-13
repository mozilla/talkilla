"use strict";

var config = require('./config').config;
var logger = require('./logger');

function Waiter(callback) {
  this.timeout = undefined;
  this.callback = callback;
  this.resolved = false;
}

Waiter.prototype.after = function(timeout, data) {
  this.timeout = setTimeout(function() {
    this.callback(data);
  }.bind(this), timeout);
};

Waiter.prototype.resolve = function(data) {
  clearTimeout(this.timeout);
  this.resolved = true;
  this.callback(data);
};

Waiter.prototype.clear = function() {
  clearTimeout(this.timeout);
};

/**
 * User class constructor
 *
 * @param {String} nick User's nick
 */
function User(nick) {
  this.nick = nick;

  // `this.timeout` represents the current timeout function until when the
  // user is considered as disconnected.
  this.timeout = undefined;

  // `this.ondisconnect` is the callback called when the user is
  // disconnected (i.e. when the timeout is triggered).
  this.ondisconnect = undefined;

  // `this.events` is a Queue of events. It is used in case the user
  // is present (i.e. the timeout was not yet triggered) but he
  // receives events between two long-polling connections.
  this.events = [];

  // `this.pending` is an object carrying the current pending
  // long-polling timeout and callback.
  // Beware, `this.pending.timeout` and `this.timeout` have different
  // purposes.
  this.pending = undefined;
}

/**
 * Send data to the user.
 *
 * @param {String} topic The type of the event to send
 * @param {Object} data An abitrary JSON serializable object
 * @return {User} chainable
 */
User.prototype.send = function(topic, data) {
  var event = {topic: topic, data: data};

  if (this.pending && !this.pending.resolved)
    // If there is an existing timeout, we resolve it with the
    // provided data.
    this.pending.resolve([event]);
  else if (this.timeout)
    // Otherwise, if the user is present, we queue the data.
    this.events.push(event);
  else
    // if we try to send data to a non present user we do not fail but
    // we log a warning.
    // Note: be careful not to expose user data here.
    logger.warn("Could not forward event " +
                topic + " to non present peer");
  return this;
};

User.prototype.connect = function() {
  this.timeout = setTimeout(function() {
    this.disconnect();
  }.bind(this), config.LONG_POLLING_TIMEOUT * 2);
};

/**
 * Extend the timeout until the user is considered as disconnected.
 *
 * @return {User} chainable
 */
User.prototype.touch = function() {
  clearTimeout(this.timeout);
  this.connect();
  return this;
};

User.prototype.disconnect = function() {
  clearTimeout(this.timeout);
  this.timeout = undefined;
  if (this.ondisconnect)
    this.ondisconnect();
};

/**
 * Transform the user into a JSON structure
 *
 * @return {Object} a JSON structure
 */
User.prototype.toJSON = function() {
  return {nick: this.nick};
};

User.prototype.clearPending = function() {
  if (this.pending) {
    this.pending.clear();
    this.pending = undefined;
  }
  return this;
};

/**
 * Wait for events to be sent to the user.
 *
 * Trigger the provided callback as soon as events are sent to the
 * user.
 *
 * If no event has been provided during a certain time
 * (i.e. config.LONG_POLLING_TIMEOUT) we return a empty array of
 * events.
 *
 * @param {Function} callback The callback to trigger in case of events.
 *
 */
User.prototype.waitForEvents = function(callback) {
  // Setup a timeout with an empty list of events as the default
  // behaviour.
  this.pending = new Waiter(callback);
  this.pending.after(config.LONG_POLLING_TIMEOUT, []);

  // If there is available events in the queue, resolve the timeout
  // immediately.
  if (this.events.length) {
    this.pending.resolve(this.events);
    this.events = [];
  }
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
  }, this);
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
  }, this);
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

module.exports.Waiter = Waiter;
module.exports.Users = Users;
module.exports.User = User;
