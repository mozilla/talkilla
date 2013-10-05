/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.Initialization = Backbone.Model.extend({
    defaults: {workerInitialized: false}
  });

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User
  });
})(app, Backbone);
