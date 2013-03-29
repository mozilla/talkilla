/*global jQuery, Backbone, _*/
/* jshint unused: false */
var Talkilla = (function($, Backbone, _) {
  "use strict";
  var app = {data: {}};
  _.extend(app, Backbone.Events);

  function debug() {
    try {
      console.log.apply(console, arguments);
    } catch (e) {}
  }

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
      // TODO: if this keeps growing, refactor as a view pool
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
      this.$el.html($('<a/>')
                      .attr('href', '#call/' + nick)
                      .append([$('<i>').addClass('icon-user'), nick]));
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
      this.$('li:not(.nav-header)').remove();
      this.$('ul').append(userList);
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
        app.trigger('signin', user);
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
        app.trigger('signout');
        app.router.index();
      });
    }
  });

  app.CallView = Backbone.View.extend({
    el: '#call',

    local: undefined,

    events: {
      'click .btn-initiate': 'initiate',
      'click .btn-hangup':   'hangup'
    },

    initialize: function(options) {
      this.hangup();
      this.user = options && options.user;
      this.callee = options && options.callee;
      this.local = $('#local-video').get(0);
    },

    initiate: function() {
      // TODO:
      // - extract the processus to some external lib?
      // - handle asynchronicity (events?)
      navigator.mozGetUserMedia(
        {video: true, audio: true},

        function onSuccess(stream) {
          debug('local video enabled');
          this.local.mozSrcObject = stream;
          this.local.play();
          this.$('.btn-initiate').addClass('disabled');
          this.$('.btn-hangup').removeClass('disabled');
        }.bind(this),

        function onError(err) {
          alert("Impossible to access your webcam/microphone");
        });
    },

    hangup: function() {
      if (this.local && this.local.mozSrcObject) {
        this.local.mozSrcObject.stop();
        this.local.mozSrcObject = null;
      }
      this.$('.btn-initiate').removeClass('disabled');
      this.$('.btn-hangup').addClass('disabled');
    },

    render: function() {
      if (!this.callee) {
        this.$el.hide();
        return this;
      }
      this.$('h2').text('Calling ' + this.callee.get('nick'));
      this.initiate();
      this.$el.show();
      return this;
    }
  });

  app.router = new app.Router();

  // app events
  app.on('signout', function() {
    // make sure any call is terminated on user signout
    this.router.callView.hangup();
  });

  Backbone.history.start();
  return app;
})(jQuery, Backbone, _);
