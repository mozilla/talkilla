/* jshint unused:false */
var CurrentUsers = (function() {
  function CurrentUsers() {
    this.users = {};
  }

  CurrentUsers.prototype = {
    has: function(userId) {
      return Object.prototype.hasOwnProperty.call(this.users, userId);
    },

    get: function(userId) {
      return this.users[userId];
    },

    set: function(userId, attributes) {
      attributes = attributes || {};
      if (!this.has(userId)) {
        this.users[userId] = attributes;
        return;
      }
      for (var attr in attributes)
        this.users[userId][attr] = attributes[attr];
    },

    getPresence: function(userId) {
      if (this.has(userId))
        return this.get(userId).presence;
    },

    reset: function() {
      this.users = {};
    },

    all: function() {
      return this.users;
    },

    /**
     * Returns current users object mapped as an array.
     *
     * XXX: - we use this to map to what the sidebar wants, really the sidebar
     *        should change so that we can just send the object.
     *      - users related logic should be moved to a dedicated object.
     *
     * @return {Array}
     */
    toArray: function() {
      if (Object.keys(this.users).length === 0)
        return [];
      return Object.keys(this.users).map(function(userId) {
        return {nick: userId, presence: this.users[userId].presence};
      }, this);
    }
  };

  return CurrentUsers;
})();
