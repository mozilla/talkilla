define([
  'backbone',
  'models/contact'
], function(Backbone, Contact) {
  return Backbone.Collection.extend({
    url: '/api/contacts.json',
    model: Contact
  });
});
