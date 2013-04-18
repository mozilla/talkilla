/* global Talkilla, Backbone */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.IncomingCall = Backbone.Model.extend({
    defaults: {callee: undefined,
               caller: undefined,
               offer: {}}
  });

  app.models.PendingCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
  });

  app.models.DeniedCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
  });

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined}
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User
  });
})(Talkilla, Backbone);
