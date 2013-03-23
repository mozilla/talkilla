/*jshint maxparams:10*/
/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'models/user',
  'text!templates/login.html',
  'jquery',
], function(Backbone, Handlebars, User, LoginTemplate, $) {
  var LoginView = Backbone.View.extend({
    el: '#loginForm',

    template: Handlebars.compile(LoginTemplate),

    user: undefined,

    events: {
      'submit form#signin': 'signin'
    },

    initialize: function(options) {
      this.user = options && options.user;
    },

    render: function() {
      this.$el.html(this.template({
        user: this.user && this.user.toJSON()
      }));
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
        dataType: 'json'
      })
      .done(function(auth) {
        if (!auth.nick)
          return alert('joining failed');
        Talkilla.user = new User({nick: auth.nick});
        Talkilla.index();
      })
      .fail(function() {
        alert('joining error');
      });
    }
  });
  return LoginView;
});
