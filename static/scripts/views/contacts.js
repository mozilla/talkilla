/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'text!templates/contacts.html'
], function(Backbone, Handlebars, ContactsTemplate) {
  return Backbone.View.extend({
    el: '#main',

    template: Handlebars.compile(ContactsTemplate),

    render: function() {
      this.$el.html(this.template({
        nick: Talkilla.nick,
        contacts: this.collection.toJSON()
      }));
      return this;
    }
  });
});
