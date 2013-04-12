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
      this.notifications.render();
      this.login.render();
      this.users.render();
      this.call.render();
      return this;
    }
  });

  /**
   * Single notification view.
   */
  app.views.NotificationView = Backbone.View.extend({
    template: _.template([
      '<div class="alert alert-<%= type %>">',
      '  <a class="close" data-dismiss="alert">&times;</a>',
      '  <%= message %>',
      '</div>'
    ].join('')),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  /**
   * Incoming call notification view.
   */
  app.views.IncomingCallNotificationView = Backbone.View.extend({
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
      app.services.ws.send(JSON.stringify({
        'call_accept': this.model.toJSON()
      }));
    },

    deny: function(event) {
      event.preventDefault();
      app.services.ws.send(JSON.stringify({
        'call_deny': this.model.toJSON()
      }));
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  /**
   * Notifications list view.
   */
  app.views.NotificationsView = Backbone.View.extend({
    el: '#messages',

    initialize: function() {
      // service events
      app.services.on('incoming_call', function(data) {
        var notification = new app.views.IncomingCallNotificationView({
          model: new app.models.IncomingCall(data)
        });
        this.addNotification(notification);
      }.bind(this));

      // app events
      app.on('signout', function() {
        this.clear();
      }.bind(this));
    },

    /**
     * Adds a new notification.
     * @param {app.views.NotificationView} notification
     */
    addNotification: function(notification) {
      this.notification = notification;
      this.render();
      return this;
    },

    clear: function() {
      this.$el.html('');
    },

    render: function() {
      if (this.notification)
        this.$el.append(this.notification.render().el);
      return this;
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
      if (this.collection.length === 1)
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
        // reset all app data
        app.data = {};
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

    // local video object
    local: undefined,

    events: {
      'click .btn-initiate': 'initiate',
      'click .btn-hangup':   'hangup'
    },

    initialize: function(options) {
      this.callee = options && options.callee;
      this.hangup();
      this.local = $('#local-video').get(0);

      // service events
      app.services.on('call_accepted', function(data) {
        // XXX: make the actual video call
        console.log(data);
      });

      app.services.on('call_denied', function(data) {
        // XXX: notify that the call has been denied
        console.log(data);
      });

      // app events
      app.on('signout', function() {
        // ensure a call is always terminated on user signout
        this.hangup();
        this.render();
      }.bind(this));
    },

    /**
     * Initiates the call.
     */
    initiate: function() {
      app.media.initiatePeerConnection(
        this.callee,

        this.local,

        function onSuccess(pc, localVideo) {
          this.local = localVideo;
          this.pc = pc;
          this.$('.btn-initiate').addClass('disabled');
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
    hangup: function() {
      if (this.local && this.local.mozSrcObject) {
        this.local.mozSrcObject.stop();
        this.local.mozSrcObject = null;
      }
      this.$('.btn-initiate').removeClass('disabled');
      this.$('.btn-hangup').addClass('disabled');
      app.trigger('hangup');
    },

    render: function() {
      if (!app.data.user || !this.callee) {
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
