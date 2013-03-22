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
      if (!nick)
        return alert('please enter a nickname');
      $.ajax({
        type: "POST",
        url: '/signin',
        data: {nick: nick},
        dataType: 'json',
        success: function(auth) {
          if (!auth.nick)
            return alert('joining failed');
          Talkilla.nick = auth.nick;
          return Talkilla.navigate('contacts', {trigger: true, replace: true});
        },
        error: function() {
          alert('joining error');
        }
      });
    }
  });
});
