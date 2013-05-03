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

    initialize: function() {
      this.notifications = new app.views.NotificationsView();
      this.login = new app.views.LoginView();
      this.users = new app.views.UsersView();
      this.call = new app.views.CallView();
    },

    render: function() {
      this.login.render();
      this.users.render();
      this.call.render();
      return this;
    }
  });

  /**
   * Base notification view.
   */
  app.views.NotificationView = Backbone.View.extend({
    template: _.template([
      '<div class="alert alert-<%= type %>">',
      '  <a class="close" data-dismiss="alert">&times;</a>',
      '  <%= message %>',
      '</div>'
    ].join('')),

    clear: function() {
      this.undelegateEvents();
      this.remove();
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  /**
   * Incoming call notification view.
   */
  app.views.IncomingCallNotificationView = app.views.NotificationView.extend({
    template: _.template([
      '<div class="alert alert-block alert-success">',
      '  <h4>Incoming call from <strong><%= caller %></strong></h4>',
      '  <p>Do you want to take the call?',
      '    <a class="btn btn-success accept" href="">Accept</a>',
      '    <a class="btn btn-error deny" href="">Deny</a>',
      '  </p>',
      '</div>'
    ].join('')),

    events: {
      'click .accept': 'accept',
      'click .deny': 'deny'
    },

    accept: function(event) {
      event.preventDefault();
      var callView = app.router.view.call;
      callView.offer = this.model.get('offer');
      callView.callee = app.data.users.findWhere({
        nick: this.model.get('caller')
      });
      callView.render();
      this.clear();
    },

    deny: function(event) {
      event.preventDefault();
      app.services.ws.send(JSON.stringify({
        'call_deny': this.model.toJSON()
      }));
      this.clear();
    }
  });

  /**
   * Pending call notification view.
   */
  app.views.PendingCallNotificationView = app.views.NotificationView.extend({
    template: _.template([
      '<div class="alert alert-block alert-success alert-pending">',
      '  <a class="close" data-dismiss="alert">&times;</a>',
      '  <p>Calling <strong><%= callee %>…</strong>',
      '    <a class="btn btn-cancel" href="">Cancel</a></p>',
      '</div>'
    ].join('')),

    events: {
      'click .btn-cancel': 'cancel'
    },

    initialize: function() {
      // app events
      app.on('hangup_done', function() {
        this.clear();
      }.bind(this));
    },

    cancel: function(event) {
      event.preventDefault();
      app.trigger('hangup');
      this.clear();
    }
  });

  /**
   * Denied call notification view.
   */
  app.views.DeniedCallNotificationView = app.views.NotificationView.extend({
    template: _.template([
      '<div class="alert alert-block alert-error">',
      '  <a class="close" data-dismiss="alert">&times;</a>',
      '  <h4><strong><%= callee %></strong> declined the call</h4>',
      '</div>'
    ].join(''))
  });

  /**
   * Notifications list view.
   */
  app.views.NotificationsView = Backbone.View.extend({
    el: '#messages',

    notifications: [],

    initialize: function() {
      // service events
      app.services.on('incoming_call', function(data) {
        var notification = new app.views.IncomingCallNotificationView({
          model: new app.models.IncomingCall(data)
        });
        this.addNotification(notification);
      }.bind(this));

      app.services.on('call_offer', function(data) {
        var notification = new app.views.PendingCallNotificationView({
          model: new app.models.PendingCall(data)
        });
        this.addNotification(notification);
      }.bind(this));

      app.services.on('call_denied', function(data) {
        var notification = new app.views.DeniedCallNotificationView({
          model: new app.models.DeniedCall(data)
        });
        this.addNotification(notification);
      }.bind(this));

      // app events
      app.on('hangup_done', function() {
        this.render();
      }.bind(this));

      app.on('signin', function() {
        this.clear();
      }.bind(this));

      app.on('signout', function() {
        this.clear();
      }.bind(this));
    },

    /**
     * Adds a new notification.
     * @param {app.views.NotificationView} notification
     */
    addNotification: function(notification) {
      var DeniedCallNotificationView = app.views.DeniedCallNotificationView;
      var PendingCallNotificationView = app.views.PendingCallNotificationView;
      var el = notification.render().el;

      this.notifications.push(notification);
      this.$el.append(el);

      // A denied call notification replace a pending call notification
      if (notification instanceof DeniedCallNotificationView)
        this.notifications = this.notifications.filter(function(notif) {
          var isPending = (notif instanceof PendingCallNotificationView);

          if (isPending)
            notif.clear();

          return !isPending;
        });

      return this;
    },

    /**
     * Clear current active notification if any and empty the notifications
     * list.
     */
    clear: function() {
      if (this.notification) {
        this.notification.clear();
        this.notification = undefined;
      }
      this.$el.html('');
    }
  });

  /**
   * User list entry view.
   */
  app.views.UserEntryView = Backbone.View.extend({
    tagName: 'li',

    template: _.template('<a href="#call/<%= nick %>"><%= nick %></a>'),

    initialize: function(options) {
      this.model = options && options.model;
      this.active = options && options.active;
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      if (this.active)
        this.$('a').addClass('active');
      return this;
    }
  });

  /**
   * User list view.
   */
  app.views.UsersView = Backbone.View.extend({
    el: '#users',

    views: [],
    activeNotification: null,

    initialize: function() {
      // refresh the users list on new received data
      app.services.on('users', function(data) {
        this.collection = new app.models.UserSet(data);
        app.data.users = this.collection;
        this.render();
      }.bind(this));

      // purge the list on sign out
      app.on('signout', function() {
        this.collection = undefined;
        this.callee = undefined;
        this.render();
      }.bind(this));

      // highlight callee's username on call
      app.on('call', function(call) {
        this.callee = call && call.callee;
        this.render();
      }.bind(this));

      // unhighlight all usernames on hang up done
      app.on('hangup_done', function() {
        this.callee = undefined;
        this.render();
      }.bind(this));
    },

    /**
     * Initializes all user entry items with every online user records except
     * the one of currently logged in user, if any.
     */
    initViews: function() {
      if (!this.collection)
        return;
      var callee = this.callee;
      this.views = [];
      this.collection.chain().reject(function(user) {
        // filter out current signed in user, if any
        if (!app.data.user)
          return false;
        return user.get('nick') === app.data.user.get('nick');
      }).each(function(user) {
        // create a dedicated list entry for each user
        this.views.push(new app.views.UserEntryView({
          model:  user,
          active: !!(callee &&
                     callee.get('nick') === user.get('nick'))
        }));
      }.bind(this));
    },

    render: function() {
      this.initViews();
      // remove user entries
      this.$('li:not(.nav-header)').remove();
      if (!this.collection)
        return this;
      // render all subviews
      var userList = _.chain(this.views).map(function(view) {
        return view.render();
      }).pluck('el').value();
      this.$('ul').append(userList);
      // show/hide element regarding auth status
      if (app.data.user)
        this.$el.show();
      else
        this.$el.hide();
      // show/hide invite if user is alone
      if (this.collection.length === 1) {
        if (!this.activeNotification)
          this.activeNotification =
            app.utils.notifyUI('You are the only person logged in, ' +
                                'invite your friends.', 'info');
      }
      else {
        if (this.activeNotification)
          this.activeNotification.clear();
        this.activeNotification = null;
      }
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

    render: function() {
      if (!app.data.user) {
        this.$('#signin').show();
        this.$('#signout').hide().find('.nick').text('');
      } else {
        this.$('#signin').hide();
        this.$('#signout').show().find('.nick').text(app.data.user.get('nick'));
      }
      return this;
    },

    /**
     * Signs in a user.
     *
     * @param  {FormEvent}  Signin form submit event
     */
    signin: function(event) {
      event.preventDefault();
      var nick = $.trim($(event.currentTarget).find('[name="nick"]').val());
      if (!nick)
        return app.utils.notifyUI('please enter a nickname');
      app.services.login(nick, function(err, user) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        app.data.user = user;
        app.trigger('signin', user);
        app.router.navigate('', {trigger: true});
        app.router.index();
      });
    },

    /**
     * Signs out a user.
     *
     * @param  {FormEvent}  Signout form submit event
     */
    signout: function(event) {
      event.preventDefault();
      app.services.logout(function(err) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        app.utils.resetApp();
      });
    }
  });

  /**
   * Main video conversation view.
   */
  app.views.CallView = Backbone.View.extend({
    el: '#call',

    // video objects
    local: undefined,
    remote: undefined,

    // The call's peer connection.
    pc: undefined,

    events: {
      'click .btn-hangup': 'hangup'
    },

    initialize: function(options) {
      this.callee = options && options.callee;
      app.trigger('hangup');
      this.local = $('#local-video').get(0);
      this.remote = $('#remote-video').get(0);

      // service events
      app.services.on('call_accepted', function(data) {
        app.media.addAnswerToPeerConnection(
          this.pc,

          data.answer,

          // Nothing to do on success
          function () {},

          function onError(err) {
            app.utils.log(err);
            app.utils.notifyUI('Unable to initiate call', 'error');
          }
        );
      }.bind(this));

      // app events
      app.on('hangup', function() {
        this.hangup();
        this.render();
      }.bind(this));

      app.on('signout', function() {
        // ensure a call is always terminated on user signout
        app.trigger('hangup');
        this.render();
      }.bind(this));

      app.on('add_local_stream', function(stream) {
        this.local.mozSrcObject = stream;
        this.local.play();
      }.bind(this));

      app.on('add_remote_stream', function(stream) {
        this.remote.mozSrcObject = stream;
        this.remote.play();
      }.bind(this));
    },

    /**
     * Initiates the call.
     */
    initiate: function() {
      app.trigger('call', {callee: this.callee});
      app.media.startPeerConnection(
        this.callee,

        this.offer,

        function onSuccess(pc) {
          this.pc = pc;
          this.$('.btn-hangup').removeClass('disabled');
        }.bind(this),

        function onError(err) {
          app.utils.log(err);
          app.utils.notifyUI('Unable to initiate call', 'error');
        });
    },

    /**
     * Hangs up the call.
     */
    hangup: function(event) {
      if (event)
        event.preventDefault();

      // Stop the media elements running
      if (this.local.mozSrcObject) {
        this.local.mozSrcObject.stop();
        this.local.mozSrcObject = null;
      }
      this.remote.pause();
      this.remote.mozSrcObject = null;

      // Now close the peer connection
      app.media.closePeerConnection(this.pc);
      this.pc = null;
      this.callee = undefined;
      app.router.navigate('', {trigger: true});
      app.trigger('hangup_done');
    },

    render: function() {
      if (!app.data.user || !this.callee) {
        this.$el.hide();
        return this;
      }
      this.$('.callee').text(this.callee.get('nick'));
      this.initiate();
      this.$el.show();
      return this;
    }
  });
})(Talkilla, Backbone, _, jQuery);
