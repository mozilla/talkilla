/*global app, AppPort, GoogleContacts, HTTP, URL, payloads */
/* jshint unused: false */
/**
 * Sidebar application.
 */
var SidebarApp = (function(app, $) {
  "use strict";

  function SidebarApp(options) {
    options = options || {};

    if (options.location)
      this._location = new URL(options.location);
    else
      this._location = window.location;

    this.http = new HTTP();
    this.appPort = new AppPort();

    this.appStatus = new app.models.AppStatus();
    this.user = new app.models.CurrentUser();
    this.users = new app.models.UserSet();
    this.spa = new app.models.SPA();

    this.services = {
      google: new GoogleContacts({
        appPort: this.appPort
      })
    };

    this.view = new app.views.AppView({
      isInSidebar: this._location.search === "?sidebar",
      appStatus: this.appStatus,
      user: this.user,
      users: this.users,
      services: this.services,
      spa: this.spa,
      spaLoginURL: options.SPA.loginURL
    });

    // user events
    this.user.on("signout", this._onUserSignout, this);
    this.user.on("signout-requested", this._onUserSignoutRequested, this);

    // port events
    this.appPort.on("talkilla.users", this._onUserListReceived, this);
    this.appPort.on("talkilla.user-joined", this._onUserJoined, this);
    this.appPort.on("talkilla.user-left", this._onUserLeft, this);
    this.appPort.on("talkilla.spa-connected", this._onSPAConnected, this);
    this.appPort.on("talkilla.error", this._onError, this);

    this.appPort.on("talkilla.spa-error", this._onSPAError, this);
    this.appPort.on("talkilla.presence-unavailable",
                 this._onPresenceUnavailable, this);
    this.appPort.on("talkilla.worker-ready", this._onWorkerReady, this);
    this.appPort.on("social.user-profile", this._onUserProfile, this);
    this.appPort.on('talkilla.reauth-needed', this._onReauthNeeded, this);
    this.appPort.on('social.port-closing', this._onSocialPortClosing(), this);

    // Forward events to the model.
    this.appPort.on("talkilla.server-reconnection", function(event) {
      this.appStatus.ongoingReconnection(new app.payloads.Reconnection(event));
    }, this);

    // SPA model events
    this.spa.on("dial", this.openConversation, this);

    window.addEventListener("message", this._onSPASetup.bind(this), false);
    window.addEventListener("resize", this._onWindowResized.bind(this), false);

    this.appPort.post("talkilla.sidebar-ready");

    this._setupDebugLogging();
  }

  SidebarApp.prototype._onWorkerReady = function() {
    this.appStatus.set("workerInitialized", true);
    // XXX Hide or disable the import button at the start and add a callback
    // here to show it when this completes.
    this.services.google.initialize();
  };

  SidebarApp.prototype._onWindowResized = function() {
    this.view.trigger("resize", window.outerWidth, window.outerHeight);
  };

  SidebarApp.prototype._onUserProfile = function(userData) {
    this.user.set({username: userData.userName});
  };

  SidebarApp.prototype._onSocialPortClosing = function() {
    console.log("social.port-closing message received by sidebar app");
  };

  SidebarApp.prototype._onUserSignoutRequested = function() {
    try {
      this.appPort.post("talkilla.spa-forget-credentials", "TalkillaSPA");
      this.appPort.post("talkilla.spa-disable", "TalkillaSPA");
    } catch (ex) {
      console.log("exception " + ex + " caught; will invoke debugger");

      /* If we get here, that means that the hard-to-reproduce intermittent
       * where logging out fails to work has happened.  Let's give ourselves
       * a chance to debug...
       *
       * Once we're convinced this bug is fixed, we will probably want to
       * remove this code.
       */
      if (app.options.DEBUG)
        /* jshint -W087 */
        debugger;
    }
    // XXX: we may want to synchronize this with the TkWorker#close
    // method from the shared worker.
    this.user.clear();
    this.users.reset();
  };

  SidebarApp.prototype.openConversation = function(peer) {
    this.appPort.post("talkilla.conversation-open", {peer: peer});
  };

  SidebarApp.prototype._onSPASetup = function(event) {
    // This handler is attached to any message the window receives.
    // This is why we exclude messages not coming from the setup page
    // (i.e. the same origin for now).
    // XXX: in the future, the setup page could be on a different origin.
    if (event.origin !== window.location.origin)
      return;

    event = JSON.parse(event.data);
    if (event.topic !== "talkilla.spa-enable")
      return;

    var talkillaSpec = new app.payloads.SPASpec(event.data);
    this.appPort.post("talkilla.spa-enable", talkillaSpec);
  };

  SidebarApp.prototype._onSPAConnected = function(event) {
    this.appStatus.set('connected', true);

    this.user.set({presence: "connected"});
    if (event && event.capabilities)
      this.spa.set({capabilities: event.capabilities});
  };

  SidebarApp.prototype._onError = function(error) {
    var errorMsg = "Error while communicating with the server";
    if (error !== undefined) {
      errorMsg += "; error: " + error;
    }
    app.utils.notifyUI(errorMsg, "error");
  };

  SidebarApp.prototype._onUserSignout = function() {
    // Reset all app data apart from the user model, as the views rely
    // on it for change notifications, and this saves re-initializing those
    // hooks.
    this.user.clear();
    this.users.reset();
  };

  SidebarApp.prototype._onUserListReceived = function(users) {
    this.users.reset(users);
  };

  SidebarApp.prototype._onUserJoined = function(userId) {
    this.users.setUserPresence(userId, "connected");
  };

  SidebarApp.prototype._onUserLeft = function(userId) {
    this.users.setUserPresence(userId, "disconnected");
  };

  SidebarApp.prototype._setupDebugLogging = function() {
    if (!app.options.DEBUG)
      return;

    // worker port events logging
    this.appPort.on("talkilla.debug", function(event) {
      console.log("worker event", event.label, event.data);
    });
  };

  return SidebarApp;
})(app, jQuery);
