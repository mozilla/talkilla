/*global jQuery, Backbone*/
jQuery(function($) {
  var loggedUser, users;

  function login(nick, cb) {
    $.ajax({
      type: "POST",
      url: '/signin',
      data: {nick: nick},
      dataType: 'json'
    })
    .done(function(auth) {
      if (!auth.nick) return cb(new Error('joining failed'));
      return cb(null, new User({nick: auth.nick}), new UserSet(auth.users));
    })
    .fail(function(xhr, textStatus, error) {
      return cb(error);
    });
  }

  function logout(cb) {
    $.ajax({
      type: "POST",
      url: '/signout',
      data: {nick: loggedUser && loggedUser.get('nick')},
      dataType: 'json'
    })
    .done(function(result) {
      return cb(null, result);
    })
    .fail(function(xhr, textStatus, error) {
      return cb(error);
    });
  }

  var AppRouter = Backbone.Router.extend({
    data: {},

    routes: {
      '': 'index'
    },

    index: function() {
      // login form
      if (this.loginView) this.loginView.undelegateEvents();
      this.loginView = new LoginView(this.data);
      this.loginView.render();

      // users list
      if (this.usersView) this.usersView.undelegateEvents();
      this.usersView = new UsersView(this.data);
      this.usersView.render();
    }
  });

  var User = Backbone.Model.extend({
    defaults: {nick: undefined}
  });

  var UserSet = Backbone.Collection.extend({
    url: '/users',
    model: User
  });

  var UsersView = Backbone.View.extend({
    el: '#users',

    initialize: function(options) {
      this.collection = options && options.users;
      if (this.collection) return this.render();
      this.collection = new UserSet();
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
      var $list = this.$el.find('ul');
      $list.find('li:not([class=nav-header])').remove();
      this.collection.each(function(user) {
        $list.append($('<li/>').text(user.get('nick')));
      });
      return this;
    }
  });

  var LoginView = Backbone.View.extend({
    el: '#login',

    events: {
      'submit form#signin': 'signin',
      'submit form#signout': 'signout',
    },

    initialize: function(options) {
      this.user = options && options.user;
    },

    render: function() {
      if (!this.user) {
        this.$el.find('#signin').show();
        this.$el.find('#signout').hide().find('.nick').text('');
      } else {
        this.$el.find('#signin').hide();
        this.$el.find('#signout').show().find('.nick').text(this.user.get('nick'));
      }
      return this;
    },

    signin: function(event) {
      event.preventDefault();
      var nick = $.trim($(event.currentTarget).find('[name="nick"]').val());
      if (!nick) return alert('please enter a nickname');
      login(nick, function(err, user, users) {
        if (err) return alert(err);
        app.data = {user: user, users: users};
        app.index();
      });
    },

    signout: function(event) {
      event.preventDefault();
      logout(function(err) {
        if (err) return alert(err);
        app.data = {user: undefined, users: undefined};
        app.index();
      });
    }
  });

  var app = new AppRouter();
  Backbone.history.start();
});
