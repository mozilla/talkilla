define([
  'backbone',
  'models/contact'
], function(Backbone, Contact) {
  return Backbone.Collection.extend({
    url: '/users',
    model: Contact
  });
});
