/*global Talkilla*/
define([
  'backbone',
  'collections/users',
  'views/login',
  'views/users'
], function(Backbone, UserCollection, LoginView, UserCollectionView) {
  return Backbone.Router.extend({
    // connected user
    user: undefined,

    routes: {
        '': 'index'
    },

    initialize: function() {
    },

    index: function() {
      // login form/status
      this.loginView = new LoginView({user: Talkilla.user});
      this.loginView.render();
      // users list
      this.userListView = new UserCollectionView();
      this.userListView.render();
    }
  });
});
