/* global Talkilla, Backbone, _, jQuery*/
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * Global app view.
   */
  app.views.AppView = Backbone.View.extend({
    el: 'body',

    data: {},

    viewClasses: {
      call:  'CallView',
      login: 'LoginView',
      users: 'UsersView'
    },

    views: {},

    initialize: function(options) {
      this.data = options && options.data || this.data;
      this.updateAll();
    },

    updateView: function(name, data) {
      var ViewClass = app.views[this.viewClasses[name]];
      if (name in this.views)
        this.views[name].undelegateEvents();
      this.views[name] = new ViewClass(data || this.data);
      this.views[name].render();
    },

    updateAll: function(data) {
      this.data = data;
      for (var name in this.viewClasses) {
        this.updateView(name);
      }
    },

    render: function() {
      for (var name in this.views) {
        var view = this.views[name];
        if (!view)
          continue;
        view.render();
      }
    }
  });

  /**
   * User list entry view.
   */
  app.views.UserEntryView = Backbone.View.extend({
    tagName: 'li',

    render: function() {
      var nick = this.model.get('nick');
      this.$el.html(
        '<a href="#call/' + nick + '"><i class="icon-user"/>' + nick + '</a>');
      return this;
    }
  });

  /**
   * User list view.
   */
  app.views.UsersView = Backbone.View.extend({
    el: '#users',

    views: [],

    initViews: function() {
      if (!this.collection)
        return;
      this.views = [];
      this.collection.chain().reject(function(user) {
        // filter out current signed in user, if any
        if (!app.data.user)
          return false;
        return user.get('nick') === app.data.user.get('nick');
      }).each(function(user) {
        // create a dedicated list entry for each user
        this.views.push(new app.views.UserEntryView({model: user}));
      }.bind(this));
    },

    render: function() {
      this.initViews();
      // remove user entries
      this.$('li:not(.nav-header)').remove();
      // render all subviews
      var userList = _.chain(this.views).map(function(view) {
        return view.render();
      }).pluck('el').value();
      this.$('ul').append(userList);
      // show/hide invitation notice
      if (app.data.user && this.collection.length === 0)
        this.$('#invite').show();
      else
        this.$('#invite').hide();
      return this;
    }
  });

  /**
   * Login/logout forms view.
   */
  app.views.LoginView = Backbone.View.extend({
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
        return app.utils.notifyUI('please enter a nickname');
      app.services.login(nick, function(err, user, users) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        app.data.user = user;
        app.data.users = users;
        app.trigger('signin', user);
        app.router.navigate('', {trigger: true});
        app.router.index();
      });
    },

    signout: function(event) {
      event.preventDefault();
      app.services.logout(function(err) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        delete app.data.callee;
        delete app.data.user;
        app.trigger('signout');
        app.router.navigate('', {trigger: true});
        app.router.index();
      });
    }
  });

  /**
   * Main video conversation view.
   */
  app.views.CallView = Backbone.View.extend({
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
      // app events
      app.on('signout', function() {
        // ensure a call is always terminated on user signout
        this.hangup();
      }.bind(this));
    },

    initiate: function() {
      app.media.initiatePeerConnection(
        this.callee, this.local,
        function onSuccess(pc, localVideo) {
          this.local = localVideo;
          this.pc = pc;
          this.$('.btn-initiate').addClass('disabled');
          this.$('.btn-hangup').removeClass('disabled');
        }.bind(this),
        function onError(err) {
          // XXX Better error handling required
          app.utils.log(err);
          app.utils.notifyUI('Unable to initiate call');
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
})(Talkilla, Backbone, _, jQuery);
