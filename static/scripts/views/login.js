/*jshint maxparams:10*/
/*global Talkilla*/
define([
  'backbone',
  'handlebars',
  'models/user',
  'collections/users',
  'views/users',
  'text!templates/login.html',
  'jquery',
], function(Backbone, Handlebars, User, UserCollection, UserCollectionView, IndexTemplate, $) {
  var LoginView = Backbone.View.extend({
    el: '#loginForm',

    template: Handlebars.compile(IndexTemplate),

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
        // refresh connection status
        var user = Talkilla.user = new User({
          nick: auth.nick
        });
        Talkilla.loginView = new LoginView({user: user});
        Talkilla.loginView.render();
        // refresh users list with auth.users
        Talkilla.userListView = new UserCollectionView({
          collection: new UserCollection(auth.users)
        });
        Talkilla.userListView.render();
      })
      .fail(function() {
        alert('joining error');
      });
    }
  });
  return LoginView;
});
