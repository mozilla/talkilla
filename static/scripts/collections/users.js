define([
  'backbone',
  'models/user'
], function(Backbone, User) {
  return Backbone.Collection.extend({
    url: '/users',
    model: User
  });
});
