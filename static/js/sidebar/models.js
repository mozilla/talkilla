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
     * Used to sort users by lowercased username.
     *
     * XXX: does it make sense for phone numbers? We should probably target
     * fullName really.
     *
     * @param  {User} item
     * @return {String}
     */
    comparator: function(item) {
      return (item.get("fullName") ||
              item.get("email")    ||
              item.get("phoneNumber")).toLowerCase();
    },

    /**
     * Find a user from its identifier which can be either an email address or
     * a phone number.
     *
     * XXX: we need a real unique id here
     *
     * @param  {String} userId Either an email address or phone number
     * @return {app.models.User|undefined}
     */
    findUser: function(userId) {
      return this.chain().filter(function(user) {
        return user.get("phoneNumber") === userId ||
               user.get("email") === userId;
      }).first().value();
    },

    /**
     * Set the presence attribute of all the users to the given value.
     *
     * @param  {String} status Either "connected" or "disconnected".
     * @return {UserSet}
     **/
    setGlobalPresence: function(status) {
      this.each(function(user) {
        user.set("presence", status);
      });
      return this;
    },

    /**
     * Update the presence of the user matching the provided identifier to
     * the given value.
     *
     * XXX: throw on user not found?
     *
     * @param {String} userId Either an email address or phone number
     * @param {String} status Either "connected" or "disconnected"
     */
    setUserPresence: function(userId, status) {
      var user = this.findUser(userId);
      if (user)
        user.set("presence", status);
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
