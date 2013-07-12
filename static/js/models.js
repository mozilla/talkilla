/* global app, Backbone */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined,
               avatar: "img/default-avatar.png",
               presence: "disconnected"},

    initialize: function() {
      // If the user has signed in or out, trigger the appropraite
      // change
      this.on("change", function() {
        if (this.isLoggedIn() && !this.wasLoggedIn())
          this.trigger('signin');
        else if (!this.isLoggedIn() && this.wasLoggedIn())
          this.trigger('signout');
      }.bind(this));
    },

    /**
     * Returns true if the user is logged in.
     */
    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('nick') !== undefined;
    },

    /**
     * Returns true if the user was logged in prior to the last change
     * on the model. Returns false if there have been no changes.
     */
    wasLoggedIn: function() {
      return this.previous('presence') !== "disconnected" &&
        this.previous('nick') !== undefined;
    }
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User,

    initialize: function(models, options) {
      this.models = models || [];
      this.options = options;
      // register the talkilla.users event
      app.port.on('talkilla.users', function(users) {
        this.reset(users);
      }.bind(this));
    }
  });
})(app, Backbone);
