/* global Talkilla, Backbone */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";
  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined}
  });

  app.models.UserSet = Backbone.Collection.extend({
    url: '/users',
    model: app.models.User
  });
})(Talkilla, Backbone);
