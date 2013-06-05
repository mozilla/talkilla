/* global app, Backbone, _, jQuery*/
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
    },

    render: function() {
      this.login.render();
      this.users.render();
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
   * Notifications list view.
   */
  app.views.NotificationsView = Backbone.View.extend({
    el: '#messages',

    notifications: [],

    initialize: function() {
      app.data.user.on('signin', function() {
        this.clear();
      }.bind(this));

      app.data.user.on('signout', function() {
        this.clear();
      }.bind(this));
    },

    /**
     * Adds a new notification.
     * @param {app.views.NotificationView} notification
     */
    addNotification: function(notification) {
      var el = notification.render().el;

      this.notifications.push(notification);
      this.$el.append(el);

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

    template: _.template('<a href="#" rel="<%= nick %>"><%= nick %></a>'),

    events: {
      'click a': 'call'
    },

    initialize: function(options) {
      this.model = options && options.model;
      this.active = options && options.active;
    },

    call: function(event) {
      event.preventDefault();
      app.port.postEvent('talkilla.call-start', {
        caller: app.data.user.get('nick'),
        callee: event.currentTarget.getAttribute('rel')
      });
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
      app.data.users = this.collection = new app.models.UserSet();

      this.collection.on('change', function() {
        this.render();
      }.bind(this));

      this.collection.on('reset', function() {
        this.render();
      }.bind(this));

      // purge the list on sign out
      app.on('signout', function() {
        this.collection.reset();
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
        if (!app.data.user.isLoggedIn())
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
      if (app.data.user.isLoggedIn())
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

    initialize: function() {
      app.data.user = new app.models.User();
      app.data.user.on('change', function(model) {
        if (!model.isLoggedIn())
          app.resetApp();

        this.render();
      }.bind(this));
    },

    render: function() {
      if (!app.data.user.get("nick")) {
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
      app.port.login(nick);
    },

    /**
     * Signs out a user.
     *
     * @param  {FormEvent}  Signout form submit event
     */
    signout: function(event) {
      event.preventDefault();
      app.port.logout();
    }
  });
})(app, Backbone, _, jQuery);
