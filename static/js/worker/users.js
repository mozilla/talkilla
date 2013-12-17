/* jshint unused:false */
var CurrentUsers = (function() {
  "use strict";

  /**
   * Represents current users list.
   */
  function CurrentUsers() {
    this.users = {};
  }

  CurrentUsers.prototype = {
    /**
     * Checks if a user is currently listed.
     * @param  {String}  userId User unique identifier
     * @return {Boolean}
     */
    has: function(userId) {
      return Object.prototype.hasOwnProperty.call(this.users, userId);
    },

    /**
     * Retrieves a listed user record.
     * @param  {String} userId User unique identifier
     * @return {Object}
     */
    get: function(userId) {
      return this.users[userId];
    },

    /**
     * Sets user information and adds it to the current list.
     * @param {String}           userId     User unique identifier
     * @param {Object|undefined} attributes User attributes
     */
    set: function(userId, attributes) {
      attributes = attributes || {};
      if (!this.has(userId)) {
        // XXX: we should have a proper user object in the future
        if (!attributes.username)
          attributes.username = userId;
        this.users[userId] = attributes;
        return;
      }
      for (var attr in attributes)
        this.users[userId][attr] = attributes[attr];

    },

    /**
     * Retrieves user presence status.
     * @param  {String} userId User unique identifier
     * @return {String}        "connected" or "disconnected"
     */
    getPresence: function(userId) {
      if (this.has(userId))
        return this.get(userId).presence;
      return "disconnected";
    },

    /**
     * Update current users list with provided contacts list, preserving the
     * presence property.
     * @param  {Array} contacts Contacts list
     */
    updateContacts: function(contacts) {
      (contacts || [])
        .forEach(function(contact) {
          contact.presence = this.getPresence(contact.username);
          this.set(contact.username, contact);
        }, this);
    },

    /**
     * Resets current users list.
     */
    reset: function() {
      this.users = {};
    },

    /**
     * Retrieves current users list as an Object.
     * @return {Object}
     */
    all: function() {
      return this.users;
    },

    /**
     * Returns current users object mapped as an array.
     *
     * @return {Array}
     */
    toArray: function() {
      if (Object.keys(this.users).length === 0)
        return [];
      return Object.keys(this.users).map(function(userId) {
        return this.users[userId];
      }, this);
    }
  };

  return CurrentUsers;
})();
