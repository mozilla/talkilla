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

      this.subpanelsView = new app.views.SubPanelsView({
        user: this.user,
        spa: this.spa,
        appStatus: this.appStatus,
        users: this.users,
        service: this.services.google
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
      this.ImportContactsView.render();
      this.subpanelsView.render();
      return this;
    }
  });

  app.views.SubPanelsView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser,
      spa: app.models.SPA,
      appStatus: app.models.AppStatus,
      users: app.models.UserSet,
      service: GoogleContacts,
    },

    el: "#subpanels",

    initialize: function() {
      this.usersView = new app.views.UsersView({
        user: this.user,
        collection: this.users,
        appStatus: this.appStatus
      });

      this.dialInView = new app.views.DialInView({
        user: this.user,
        spa: this.spa
      });

      this.gearMenuView = new app.views.GearMenuView({
        user: this.user
      });

      this.importContactsView = new app.views.ImportContactsView({
        user: this.user,
        service: this.service,
        spa: this.spa
      });

      this.spa.on('change:capabilities', this.render, this);
      this.user.on('signin signout', this.render, this);
    },

    render: function() {
      if (!this.appStatus.get('workerInitialized'))
        return this;
      if (!this.user.get('username')) {
        // SPA is initialized but user is not connected.
        this.$el.hide();
      } else {
        // The user is connected to the SPA.
        if (this.spa.supports('pstn-call')) {
          this.$('#dialin-tab').show();
        } else {
          this.$('#dialin-tab').hide();
        }
        this.usersView.render();
        this.dialInView.render();
        this.gearMenuView.render();
        this.importContactsView.render();
        this.$el.show();
      }
      return this;
    }
  });

  /**
   * SPA view.
   */
  app.views.DialInView = app.views.BaseView.extend({
    dependencies: {
      spa: app.models.SPA,
      user: app.models.CurrentUser
    },

    el: "#pstn-dialin",

    events: {
      "submit form": "dial"
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

  app.views.GearMenuView = app.views.BaseView.extend({
    dependencies: {
      user: app.models.CurrentUser,
    },

    el: '#gear-menu',

    events: {
      'submit form#signout': 'signout'
    },

    initialize: function() {
      this.user.on('change:username', this.render, this);
    },

    render: function() {
      this.$('#signout .username').text(this.user.get('username'));
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

    el: '#login',

    initialize: function() {
      this.user.on('signin signout', this.render, this);
      this.appStatus.on('change:workerInitialized', this.render, this);
      this._linkShareView = new app.views.LinkShareView({
        user: this.user,
        originUrl: window.location.origin
      });
    },

    render: function() {
      if (!this.appStatus.get('workerInitialized')) {
        // SPA worker is not yet initialized.
        this.$('[name="spa-setup"]').remove();
      } else if (!this.user.get("username")) {
        // SPA is initialized but user is not connected.
        // XXX: shouldn't we test for user auth status instead?
        if (!this.$('#signin').length) {
          var iframe = $("<iframe>")
            .attr("src", this.spaLoginURL)
            .attr("id", "signin")
            .attr("name", "spa-setup");

          this.$(".login-iframe-container").append(iframe);
        }
      } else {
        // The user is connected to the SPA.
        this.$('#signin').hide();
        this.$('[name="spa-setup"]').remove();
      }
      this._linkShareView.render();
      return this;
    }
  });

  /**
   * View which displays a link that the user can pass to someone else out of
   * band to complete a call.
   *
   * @param {app.models.CurrentUser}  the current user.
   */
  app.views.LinkShareView = app.views.BaseView.extend({

    dependencies: {
      user: app.models.CurrentUser,
      originUrl: String
    },

    el: "#link-share",

    template: _.template([
      '<div class="form-inline">',
      '  <label class="link-share-label" for="link-share-input">',
      '  Share this link with a Talkilla user to video chat:',
      '  </label>',
      '  <input id="link-share-input" class="input-block-level "',
      '         readonly="true"   type="url"',
      '         value="<%= url %>">',
      '</div>'
    ].join('')),

    render: function() {
      if (!this.user.isLoggedIn() || !this.user.get("username")) {
        this.$el.hide();
        return this;
      }

      var linkToCopy = this.originUrl + "/instant-share/" +
        encodeURIComponent(this.user.get("username"));

      this.$el.html(this.template({url: linkToCopy}));

      this.$el.show();

      return this;
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
