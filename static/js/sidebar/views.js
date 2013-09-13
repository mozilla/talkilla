/*global app, sidebarApp */
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * Global app view.
   */
  app.views.AppView = Backbone.View.extend({
    el: 'body',

    initialize: function(options) {
      options = options || {};
      if (!options.user)
        throw new Error("missing parameter: user");
      if (!options.users)
        throw new Error("missing parameter: users");

      this.notifications = new app.views.NotificationsView({
        user: options.user
      });

      this.login = new app.views.LoginView({
        user: options.user
      });

      this.users = new app.views.UsersView({
        user: options.user,
        collection: options && options.users
      });
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

    initialize: function(options) {
      options = options || {};
      if (!options.user)
        throw new Error("missing parameter: user");
      this.user = options.user;

      this.user.on('signin signout', this.clear, this);
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

    template: _.template([
      '<a href="#" rel="<%= nick %>">',
      '  <div class="avatar">',
      '    <img src="<%= avatar %>">',
      '    <span class="status status-<%= presence %>"></span>',
      '  </div>',
      '  <span class="username"><%= nick %></span>',
      '</a>'
    ].join('')),

    events: {
      'click a': 'openConversation'
    },

    initialize: function(options) {
      this.model = options && options.model;
      this.active = options && options.active;
    },

    openConversation: function(event) {
      event.preventDefault();
      // XXX: we shouldn't be calling the app directly here
      sidebarApp.openConversation(event.currentTarget.getAttribute('rel'));
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

    initialize: function(options) {
      options = options || {};
      if (!options.user)
        throw new Error("missing parameter: user");
      this.user = options.user;

      this.collection.on('reset change', this.render, this);
    },

    /**
     * Initializes all user entry items with every online user records except
     * the one of currently logged in user, if any.
     */
    initViews: function() {
      if (!this.collection)
        return;
      var callee = this.callee;
      var session = this.user;
      this.views = [];
      this.collection.chain().reject(function(user) {
        // filter out current signed in user, if any
        if (!session.isLoggedIn())
          return false;
        return user.get('nick') === session.get('nick');
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
      if (this.user.isLoggedIn())
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
      'click #signin': 'signin',
      'submit form#signout': 'signout'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.user)
        throw new Error("missing parameter: user");
      this.user = options.user;

      this.user.on('change', this.render, this);

      // Display the correct buttons now we've loaded.
      // XXX We should probably delay this until after
      // navigator.id.watch completes, but we need to work
      // out full mechanisms and flows for what happens there.
      this.render();
    },

    render: function() {
      if (!this.user.get("nick")) {
        this.$('#signin').show();
        this.$('#signout').hide().find('.nick').text('');
      } else {
        this.$('#signin').hide();
        this.$('#signout').show().find('.nick').text(this.user.get('nick'));
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
      navigator.id.request();
    },

    /**
     * Signs out a user.
     *
     * @param  {FormEvent}  Signout form submit event
     */
    signout: function(event) {
      event.preventDefault();
      navigator.id.logout();
    }
  });
})(app, Backbone, _);
