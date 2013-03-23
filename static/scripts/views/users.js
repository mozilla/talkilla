/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'collections/users',
  'text!templates/users.html'
], function(Backbone, Handlebars, UserCollection, UsersTemplate) {
  return Backbone.View.extend({
    el: '#users',

    template: Handlebars.compile(UsersTemplate),

    initialize: function() {
      this.collection = new UserCollection();
      this.collection.fetch({
        error: function() {
            alert('Could not load connected users list');
        },
        success: function(users) {
          this.render();
        }.bind(this)
      });
    },

    render: function() {
      this.$el.html(this.template({
        users: this.collection.toJSON()
      }));
      return this;
    }
  });
});
