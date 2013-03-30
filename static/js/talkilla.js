/*global jQuery, Backbone, _, RTC*/
/* jshint unused: false */
var Talkilla = (function($, Backbone, _, RTC) {
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

  app.UserEntryView = Backbone.View.extend({
    tagName: 'li',

    render: function() {
      var nick = this.model.get('nick');
      this.$el.html($('<a/>').attr('href', '#call/' + nick).text(nick));
      return this;
    }
  });

  app.UsersView = Backbone.View.extend({
    el: '#users',

    views: [],

    initViews: function() {
      this.views = [];
      this.collection.each(function(model) {
        this.views.push(new app.UserEntryView({model: model}));
      }.bind(this));
    },

    initialize: function(options) {
      this.collection = options && options.users;
      if (this.collection) {
        this.initViews();
        return this.render();
      }
      this.collection = new app.UserSet();
      this.collection.fetch({
        error: function() {
          alert('Could not load connected users list');
        },
        success: function(users) {
          this.initViews();
          this.render();
        }.bind(this)
      });
    },

    render: function() {
      var userList = _.chain(this.views).map(function(view) {
        return view.render();
      }).pluck('el').value();
      this.$('ul').html(userList);
      if (app.data.user && this.collection.length === 0)
        this.$('#invite').show();
      else
        this.$('#invite').hide();
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

  app.VideoView = Backbone.View.extend({
    tagName: 'video',

    initialize: function(options) {
      this.stream = options && options.stream;
    },

    render: function() {
      this.el.mozSrcObject = this.el.src = this.stream;
      return this;
    },

    play: function() {
      this.el.play();
    }
  });

  app.CallView = Backbone.View.extend({
    el: '#call',

    videoView: undefined,

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
          this.videoView = new app.VideoView({
            stream: stream
          });
          this.videoView.render();
          this.$('.video').html(this.videoView.el);
          this.videoView.play();
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
})(jQuery, Backbone, _, RTC);
