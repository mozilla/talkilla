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
      this.loginView = new app.views.LoginView({
        appStatus: this.appStatus,
        spaLoginURL: this.spaLoginURL,
        user: this.user
      });

      this.usersView = new app.views.UsersView({
        user: this.user,
        collection: this.users,
        appStatus: this.appStatus
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

      this.notificationsView = new app.views.NotificationsView({
        user: this.user,
        appStatus: this.appStatus
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
      user: app.models.CurrentUser,
      appStatus: app.models.AppStatus
    },

    el: '#messages',

    notifications: [],

    initialize: function() {
      this.user.on('signin signout', this.clear, this);
      this.appStatus.on("change:reconnecting", function(appStatus) {
        if (appStatus.get("reconnecting") !== false){
          this.notifyReconnectionPending(appStatus.get("reconnecting"));
        }
      }, this);

      this.appStatus.on("change:connected", function(appStatus) {
        if (appStatus.get("connected") === true){
          this.notifyReconnectionSuccess();
        }
      }, this);
    },

    notifyReconnectionPending: function(event) {
      var timeout = event.timeout;
      var msg = "We lost the connection with the server. " +
                "Attempting a reconnection in " +
                timeout / 1000 + "s...";

      app.utils.notifyUI(msg, "error", timeout);
      console.log(msg);
    },

    notifyReconnectionSuccess: function() {
      this.appStatus.set("reconnecting", false);
      this.appStatus.set("firstReconnection", undefined);
      // XXX We should only clear reconnection notifications here.
      this.clear();
      app.utils.notifyUI("Reconnected to the server.", "success", 2000);
    },

    /**
     * Adds a new notification.
     * @param {app.views.NotificationView} notification
     */
    addNotification: function(notification) {
      var el = notification.render().el;

      this.notifications.push(notification);
      this.$el.append(el);

      // Clear the notification once the timeout reached.
      if (notification.model.has("timeout")) {
        setTimeout(notification.clear.bind(notification),
                   notification.model.get("timeout"));
      }

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
    dependencies: {
      model:  app.models.user,
      active: Boolean
    },

    tagName: 'li',

    template: _.template([
      '<a class="user-entry" href="#" rel="<%= username %>"',
      '   title="<%= username %>">',
      '  <div class="avatar">',
      '    <img src="<%= avatar %>">',
      '    <span class="status status-<%= presence %>"></span>',
      '  </div>',
      '  <div class="user-entry-details">',
      '    <p class="username"><%= fullName %></p>',
      '    <p class="address-info"><%= username %></p>',
      '  </div>',
      '</a>'
    ].join('')),

    events: {
      'click a': 'openConversation'
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
      collection: app.models.UserSet,
      appStatus: app.models.AppStatus
    },

    el: '#users',

    views: [],
    activeNotification: null,

    initialize: function() {
      this.collection.on("reset change", this.render, this);
      this.appStatus.on("change:reconnecting", function(appStatus) {
        if (appStatus.get("reconnecting") !== false)
          this.updateUsersPresence("disconnected");
      }, this);
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
          active: !!(callee && callee.get('username') === user.get('username'))
        }));
      }.bind(this));
    },

    /**
     * Set the presence attribute of all the users to the given value.
     *
     * @param  {String} the status to set.
     **/
    updateUsersPresence: function(status) {
      // Show all the users as disconnected.
      this.collection.each(function(user) {
        user.set("presence", status);
      });
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

    el: '.sidebar',

    events: {
      'submit form#signout': 'signout'
    },

    initialize: function() {
      this.user.on('signin signout', this.render, this);
      this.appStatus.on('change:workerInitialized', this.render, this);
    },

    render: function() {
      if (!this.appStatus.get('workerInitialized')) {
        // SPA worker is not yet initialized.
        $('[name="spa-setup"]').remove();
      } else if (!this.user.get("username")) {
        // SPA is initialized but user is not connected.
        if (!$('#signin').length) {
          var iframe = $("<iframe>")
            .attr("src", this.spaLoginURL)
            .attr("id", "signin")
            .attr("name", "spa-setup");
          $("#login p:first").append(iframe);
        }
        $('#subpanels').hide();
      } else {
        // The user is connected to the SPA.
        $('#signin').hide();
        $('[name="spa-setup"]').remove();
        $('#signout').show().find('.username')
            .text(this.user.get('username'));
        $('#subpanels').show();
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
      var id = this.spa.supports("pstn-call") ? "phoneNumber" : "email";
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
