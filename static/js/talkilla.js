/*global jQuery, Backbone, RTC*/
/* jshint unused: false */
var Talkilla = (function($, Backbone, RTC) {
  "use strict";
  var app = {data: {}};

  function login(nick, cb) {
    $.ajax({
      type: "POST",
      url: '/signin',
      data: {nick: nick},
      dataType: 'json'
    })
    .done(function(auth) {
      return cb(null,
                new app.User({nick: auth.nick}),
                new app.UserSet(auth.users));
    })
    .fail(function(xhr, textStatus, error) {
      return cb(error);
    });
  }

  function logout(cb) {
    $.ajax({
      type: "POST",
      url: '/signout',
      data: {nick: app.data.user && app.data.user.get('nick')},
      dataType: 'json'
    })
    .done(function(result) {
      return cb(null, result);
    })
    .fail(function(xhr, textStatus, error) {
      return cb(error);
    });
  }

  app.Router = Backbone.Router.extend({
    routes: {
      'call/:with': 'call',
      '*actions':   'index'
    },

    updateViews: function() {
      // login form
      if (this.loginView)
        this.loginView.undelegateEvents();
      this.loginView = new app.LoginView(app.data);
      this.loginView.render();
      // users list
      if (this.usersView)
        this.usersView.undelegateEvents();
      this.usersView = new app.UsersView(app.data);
      this.usersView.render();
      // call view
      if (this.callView)
        this.callView.undelegateEvents();
      this.callView = new app.CallView(app.data);
      this.callView.render();
    },

    index: function() {
      this.updateViews();
    },

    call: function(callee) {
      if (!app.data.user) {
        alert('Please join for calling someone');
        return this.navigate('', {trigger: true, replace: true});
      }
      app.data.callee = app.data.users.findWhere({nick: callee});
      this.updateViews();
    }
  });

  app.User = Backbone.Model.extend({
    defaults: {nick: undefined}
  });

  app.UserSet = Backbone.Collection.extend({
    url: '/users',
    model: app.User
  });

  app.UsersView = Backbone.View.extend({
    el: '#users',

    initialize: function(options) {
      this.collection = options && options.users;
      if (this.collection)
        return this.render();
      this.collection = new app.UserSet();
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
      if (app.data.user && this.collection.length === 0)
        $('#invite').show();
      else
        $('#invite').hide();
      this.collection.each(function(user) {
        $list.append(
          $('<li/>').append(
            $('<a/>').attr('href', '#call/' + user.get('nick'))
                     .text(user.get('nick'))));
      });
      return this;
    }
  });

  app.LoginView = Backbone.View.extend({
    el: '#login',

    events: {
      'submit form#signin': 'signin',
      'submit form#signout': 'signout'
    },

    initialize: function(options) {
      this.user = options && options.user;
    },

    render: function() {
      if (!this.user) {
        this.$('#signin').show();
        this.$('#signout').hide().find('.nick').text('');
      } else {
        this.$('#signin').hide();
        this.$('#signout').show().find('.nick').text(this.user.get('nick'));
      }
      return this;
    },

    signin: function(event) {
      event.preventDefault();
      var nick = $.trim($(event.currentTarget).find('[name="nick"]').val());
      if (!nick)
        return alert('please enter a nickname');
      login(nick, function(err, user, users) {
        if (err)
          return alert(err);
        app.data.user = user;
        app.data.users = users;
        app.router.index();
      });
    },

    signout: function(event) {
      event.preventDefault();
      logout(function(err) {
        if (err)
          return alert(err);
        delete app.data.callee;
        delete app.data.user;
        app.router.index();
      });
    }
  });

  app.CallView = Backbone.View.extend({
    el: '#call',

    initialize: function(options) {
      this.user = options && options.user;
      this.callee = options && options.callee;
    },

    render: function() {
      if (!this.callee) {
        this.$el.hide();
        return this;
      }
      this.$('h2').text('Calling ' + this.callee.get('nick'));
      RTC.getUserMedia(
        {video: true, audio: true},

        function onSuccess(stream) {
          // TODO: most of this could be handled by a dedicated view
          var video = document.createElement('video');
          video.mozSrcObject = video.src = stream;
          this.$('.video').html(video);
          video.play();
          this.$el.show();
        }.bind(this),

        function onError(err) {
          alert("Impossible to access your webcam/microphone");
        });
      return this;
    }
  });

  if (!RTC.check()) {
    return alert("Your browser doesn't support getUserMedia, game over.");
  }
  app.router = new app.Router();
  Backbone.history.start();
  return app;
})(jQuery, Backbone, RTC);
