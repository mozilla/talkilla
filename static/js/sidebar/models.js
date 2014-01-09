/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.AppStatus = Backbone.Model.extend({
    defaults: {workerInitialized: false,
               firstReconnection: undefined,
               reconnecting: false},
    /**
     * Triggered when a reconnection event occured on the server.
     *
     * @param {object} the event object.
     **/
    ongoingReconnection: function(event) {
      console.log("evenement de reconnection.", event);
      // Reconnections can happen without the user notifying it.
      // To accomplish this, we store some state about the reconnection
      // in here, and only change the reconnecting property when
      // the user should be notified.
      if (this.get('firstReconnection') === undefined){
        this.set('firstReconnection', new Date());
      }
      // Only notify the users there is a server-connection problem after
      // trying for some time (10s)
      if (new Date() - this.get('firstReconnection') >= 10000){
        this.set('reconnecting', event.timeout);
      }
    }
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User,
    comparator: function(item) {
        return item.get('username').toLowerCase();
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
