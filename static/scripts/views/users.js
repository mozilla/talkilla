/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'text!templates/users.html'
], function(Backbone, Handlebars, UsersTemplate) {
  return Backbone.View.extend({
    el: '#users',

    template: Handlebars.compile(UsersTemplate),

    render: function() {
      this.$el.html(this.template({
        users: this.collection.toJSON()
      }));
      return this;
    }
  });
});
