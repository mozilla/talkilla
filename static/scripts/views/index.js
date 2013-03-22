/*global Talkilla*/
define([
  'backbone',
  'models/auth',
  'handlebars',
  'text!templates/index.html',
  'jquery',
], function(Backbone, Auth, Handlebars, IndexTemplate, $) {
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
      var auth = new Auth({nick: nick});
      auth.fetch({
        error: function() {
            alert('auth error');
        },
        success: function(auth) {
          if (auth.get('ok')) {
            Talkilla.nick = nick;
            return Talkilla.navigate('contacts', {trigger: true, replace: true});
          }
          alert('auth failed');
        }
      });
    }
  });
});
