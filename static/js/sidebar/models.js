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
