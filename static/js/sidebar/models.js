/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.AppStatus = Backbone.Model.extend({
    defaults: {workerInitialized: false}
  });

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User
  });

  app.models.CurrentUser = app.models.User.extend({
    initialize: function() {
      navigator.id.watch({
        onlogin: this._signin.bind(this)
      });
      app.models.User.prototype.initialize.apply(this, arguments);
    },

    _signin: function(assertion) {
      if (!this.isLoggedIn())
        this.trigger('signin-requested', assertion);
    },

    signin: function() {
      if (!this.isLoggedIn())
        navigator.id.request();
    },

    signout: function() {
      this.trigger('signout-requested');
    }
  });
})(app, Backbone);
