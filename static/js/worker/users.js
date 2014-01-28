/* jshint unused:false */
var CurrentUsers = (function() {
  "use strict";

  /**
   * Represents current users list.
   *
   * XXX Really we should refactor this into an array of users. The Users
   * would have a contact property, storing the contact information from the
   * contactsDb, and a presence property. Access to specific users is by
   * filtering within the contact information.
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
    set: function(userId, attributes, field) {
      attributes = attributes || {};
      if (!this.has(userId)) {
        // XXX: we should have a proper user object in the future
        if (!attributes.username)
          attributes.username = userId;
        // XXX: We currently need to ensure we have the field set, as
        // well as the username. See the XXX comment at the start of
        // this file.
        attributes[field] = userId;
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
    updateContacts: function(contacts, field) {
      (contacts || [])
        .forEach(function(contact) {
          if (contact[field]) {
            var username = contact[field];
            contact.username = username;
            contact.presence = this.getPresence(username);
            this.set(username, contact, field);
          }
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
