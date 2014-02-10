/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.AppStatus = Backbone.Model.extend({
    defaults: {workerInitialized: false,
               firstReconnection: undefined,
               reconnecting: false,
               connected: false
             },
    /**
     * Triggered when a reconnection event occured on the server.
     *
     * @param {app.payloads.Reconnection} the reconnection payload object.
     **/
    ongoingReconnection: function(reconnectionMsg) {
      // Reconnections can happen without the user notifying it.
      // To accomplish this, we store some state about the reconnection
      // in here, and only change the reconnecting property when
      // the user should be notified.
      if (this.get('firstReconnection') === undefined){
        this.set('firstReconnection', new Date());
      } else if (new Date() - this.get('firstReconnection') >= 10000){
        // Only notify the users there is a server-connection problem after
        // trying for some time (10s)
        this.set('connected', false);
        this.set('reconnecting', reconnectionMsg);
      }
    }
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User,

    /**
     * Generates a function capable of comparing a user model to a user
     * identifier.
     *
     * XXX: we need a real unique id here
     *
     * @private
     * @param  {String} userId Either an email address or a phone number.
     * @return {Function}
     */
    _userIs: function(userId) {
      return function(user) {
        return user.get("username")    === userId ||
               user.get("email")       === userId ||
               user.get("phoneNumber") === userId;
      };
    },

    /**
     * Used to sort users by lowercased full name, email or phone number when
     * available.
     *
     * @param  {User} user
     * @return {String}
     */
    comparator: function(user) {
      return (user.get("fullName") ||
              user.get("email")    ||
              user.get("phoneNumber")).toLowerCase();
    },

    /**
     * Excludes a user having the provided id from the list.
     *
     * XXX: we need a real unique id here
     *
     * @param  {String} userId Either username, email address or phone number.
     * @return {Array}
     */
    excludeUser: function(userId) {
      return this.reject(this._userIs(userId));
    },

    /**
     * Find a user from its identifier which can be either an email address or
     * a phone number.
     *
     * XXX: we need a real unique id here
     *
     * @param  {String} userId Either username, email address or phone number.
     * @return {app.models.User|undefined}
     */
    findUser: function(userId) {
      // XXX possible micro-optimization: use some() instead of filter() so the
      //     loop breaks early.
      return this.chain().filter(this._userIs(userId)).first().value();
    },

    /**
     * Set the presence attribute of all the users to the given value.
     *
     * @param  {String} status Either "connected" or "disconnected".
     * @return {UserSet}
     **/
    setGlobalPresence: function(status) {
      return this.chain().each(function(user) {
        user.set("presence", status);
      });
    },

    /**
     * Update the presence of the user matching the provided identifier to
     * the given value.
     *
     * XXX: - Throw on user not found?
     *      - We need a real unique id here.
     *
     * @param {String} userId Either username, email address or phone number
     * @param {String} status Either "connected" or "disconnected"
     */
    setUserPresence: function(userId, status) {
      var user = this.findUser(userId);
      if (user)
        user.set("presence", status);
    },

    /**
     * Updates user presence status to connected when found, adds a new entry
     * when not.
     *
     * XXX: we need a real unique id here
     *
     * @param  {String} userId Either username, email address or phone number.
     * @return {app.models.User} user User entry
     */
    userJoined: function(userId) {
      var user = this.findUser(userId);
      if (!user) {
        user = new app.models.User({
          username: userId, // XXX what about email/phonenumber?
          presence: "connected"
        });
        this.add(user);
      } else {
        user.set("presence", "connected");
      }
      return user;
    },

    /**
     * Updates user presence status to disconnected when it's a contact, removes
     * the entry from the list when not.
     *
     * XXX: we need a real unique id here
     *
     * @param {String} userId Either username, email address or phone number
     */
    userLeft: function(userId) {
      var user = this.findUser(userId);
      if (!user)
        return;
      if (user.get("isContact"))
        this.setUserPresence(userId, "disconnected");
      else
        this.remove(user);
    }
  });

  /**
   * This models the currently signed-in user.
   */
  app.models.CurrentUser = app.models.User.extend({
    /**
     * We user Persona for authentication of email only, we do not use
     * Persona as a session provider.
     */
    initialize: function() {
      app.models.User.prototype.initialize.apply(this, arguments);
    },

    /**
     * Sign out a user.
     */
    signout: function() {
      this.trigger('signout-requested');
    }
  });
})(app, Backbone);
