/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'text!templates/index.html',
  'jquery',
], function(Backbone, Handlebars, IndexTemplate, $) {
  return Backbone.View.extend({
    el: '#main',

    events: {
      'submit form#signin': 'signin'
    },

    template: Handlebars.compile(IndexTemplate),

    render: function() {
      this.$el.html(this.template());
      return this;
    },

    signin: function(event) {
      event.preventDefault();
      var nick = $.trim($(event.currentTarget).find('[name="nick"]').val());
      if (!nick) {
        return alert('please enter a nickname');
      }
      Talkilla.nick = nick;
      Talkilla.navigate('contacts', {trigger: true, replace: true});
    }
  });
});
