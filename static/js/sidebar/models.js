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
    model: app.models.User
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
      navigator.id.watch({
        onlogin: this._onSignin.bind(this)
      });
      app.models.User.prototype.initialize.apply(this, arguments);
    },

    /**
     * Called when the user is signed in via persona.
     *
     * @param personaAssertion The assertion from persona to verify the user on
     *                         the user
     */
    _onSignin: function(personaAssertion) {
      if (!this.isLoggedIn())
        this.trigger('signin-requested', personaAssertion);
    },

    /**
     * Authenticate a user via persona.
     */
    signin: function() {
      if (!this.isLoggedIn())
        navigator.id.request();
    },

    /**
     * Sign out a user.
     */
    signout: function() {
      this.trigger('signout-requested');
    }
  });
})(app, Backbone);
