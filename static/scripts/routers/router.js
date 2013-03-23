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
      // login form || auth status
      this.loginView = new LoginView({user: this.user});
      this.loginView.render();
      // users list
      var users = new UserCollection();
      users.fetch({
        error: function() {
            alert('Could not load connected users list');
        },
        success: function(users) {
          this.userListView = new UserCollectionView({collection: users});
          this.userListView.render();
        }.bind(this)
      });
    }
  });
});
