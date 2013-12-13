/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.AppStatus = Backbone.Model.extend({
    defaults: {workerInitialized: false}
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
