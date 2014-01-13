/*global app, sidebarApp, GoogleContacts*/
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * Global app view.
   */
  app.views.AppView = app.views.BaseView.extend({
    dependencies: {
      appStatus: app.models.AppStatus,
      services:  Object,
      spa:       app.models.SPA,
      user:      app.models.CurrentUser,
      users:     app.models.UserSet
    },

    el: 'body',

    events: {
      'click a.user-entry': 'clickUserEntry'
    },

    isInSidebar: false, // default to panel

    initialize: function(options) {
      this.notificationsView = new app.views.NotificationsView({
        user: this.user
      });

      this.loginView = new app.views.LoginView({
        appStatus: this.appStatus,
        spaLoginURL: options.spaLoginURL,
        user: this.user
      });

      this.usersView = new app.views.UsersView({
        user: this.user,
        collection: this.users
      });

      this.importButtonView = new app.views.ImportContactsView({
        user: this.user,
        service: this.services.google,
        spa: this.spa
      });

      this.spaView = new app.views.SPAView({
        user: this.user,
        spa: this.spa
      });

      if (options.isInSidebar)
        this.isInSidebar = options.isInSidebar;

      this.on("resize", this._onResize, this);

      window.addEventListener("unload", this._onUnload.bind(this));
    },

    _onResize: function(width, height) {
      if (this.isInSidebar)
        return;
      var safetyHeightMargin = 120; // 120px height safety margin
      this.$el.css("max-height", (height - safetyHeightMargin) + "px");
    },

    // for debugging, to see if we're getting unload events only from the
    // panel, or also from contained iframes
    _onUnload: function(e) {
      console.log("panel unload called, target =  ", e.target);
    },

    clickUserEntry: function() {
      if (!this.isInSidebar)
        window.close();
    },

    render: function() {
      this.loginView.render();
      this.usersView.render();
      this.importButtonView.render();
      this.spaView.render();
      return this;
    }
  });

  /**
   * SPA view.
   */
  app.views.SPAView = app.views.BaseView.extend({
    dependencies: {
      spa: app.models.SPA,
      user: app.models.CurrentUser
    },

    el: "#pstn-dialin",

    events: {
      "submit form": "dial"
    },

    initialize: function() {
      this.spa.on("change:capabilities", this.render, this);
      this.user.on('signin signout', this.render, this);
    },

    dial: function(event) {
      event.preventDefault();

      this.spa.dial(event.currentTarget.number.value);
    },

    display: function(show) {
      if (show)
        this.$el.removeClass("hide");
      else
        this.$el.addClass("hide");
    },

    render: function() {
      this.display(this.user.isLoggedIn() && this.spa.supports("pstn-call"));
    }
  });

  /**
   * Notifications list view.
   */
  app.views.NotificationsView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser
    },

    el: '#messages',

    notifications: [],

    initialize: function() {
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
  app.views.UserEntryView = app.views.BaseView.extend({
    tagName: 'li',

    template: _.template([
      '<a class="user-entry" href="#" rel="<%= username %>"',
      '   title="<%= username %>">',
      '  <div class="avatar">',
      '    <img src="<%= avatar %>">',
      '    <span class="status status-<%= presence %>"></span>',
      '  </div>',
      '  <span class="username"><%= fullName %></span>',
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
  app.views.UsersView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser,
      collection: app.models.UserSet
    },

    el: '#users',

    views: [],
    activeNotification: null,

    initialize: function() {
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
        return user.get('username') === session.get('username');
      }).each(function(user) {
        // create a dedicated list entry for each user
        this.views.push(new app.views.UserEntryView({
          model:  user,
          active: !!(callee &&
                     callee.get('username') === user.get('username'))
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
      if (this.user.isLoggedIn() && this.collection.length === 1) {
        if (!this.activeNotification)
          this.activeNotification =
            app.utils.notifyUI('You are the only person logged in, ' +
                                'invite your friends or load your existing ' +
                                'contacts (see below).', 'info');
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
  app.views.LoginView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser,
      appStatus: app.models.AppStatus,
      spaLoginURL: String
    },

    el: '#login',

    events: {
      'submit form#signout': 'signout'
    },

    initialize: function() {
      this.user.on('signin signout', this.render, this);
      this.appStatus.on('change:workerInitialized', this.render, this);
    },

    render: function() {
      if (!this.appStatus.get('workerInitialized')) {
        this.$('#signout').hide();
        this.$('[name="spa-setup"]').remove();
      } else if (!this.user.get("username")) {
        if (!$('#signin').length) {
          var iframe = $("<iframe>")
            .attr("src", this.spaLoginURL)
            .attr("id", "signin")
            .attr("name", "spa-setup");
          $("#login p:first").append(iframe);
        }
        this.$('#signout').hide().find('.username').text('');
      } else {
        this.$('#signin').hide();
        this.$('[name="spa-setup"]').remove();
        this.$('#signout').show().find('.username')
            .text(this.user.get('username'));
      }
      return this;
    },

    /**
     * Signs out a user.
     *
     * @param  {FormEvent}  Signout form submit event
     */
    signout: function(event) {
      event.preventDefault();
      this.user.signout();
    }
  });

  app.views.ImportContactsView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser,
      service: GoogleContacts,
      spa: app.models.SPA,
    },

    el: "#import-contacts",

    events: {
      "click button": 'loadGoogleContacts'
    },

    initialize: function() {
      this.user.on('signin signout', this.render, this);
    },

    loadGoogleContacts: function() {
      var id;
      if (this.spa.supports("pstn-call")) {
        id = "phoneNumber";
      } else {
        id = "email";
      }
      this.service.loadContacts(id);
    },

    render: function() {
      if (this.user.isLoggedIn())
        this.$el.show();
      else
        this.$el.hide();
      return this;
    }
  });
})(app, Backbone, _);
