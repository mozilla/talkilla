/*global app, AppPort, GoogleContacts, HTTP, payloads */
/* jshint unused: false */
/**
 * Sidebar application.
 */
var SidebarApp = (function(app, $) {
  "use strict";

  function SidebarApp(options) {
    options = options || {};

    this.http = new HTTP();
    this.appPort = new AppPort();

    this.appStatus = new app.models.AppStatus();
    this.user = new app.models.CurrentUser();
    this.users = new app.models.UserSet();
    this.spa = new app.models.SPA();

    this.reconnecting = false; // true if we are doing a reconnection.

    this.services = {
      google: new GoogleContacts({
        appPort: this.appPort
      })
    };

    this.view = new app.views.AppView({
      appStatus: this.appStatus,
      user: this.user,
      users: this.users,
      services: this.services,
      spa: this.spa
    });

    // user events
    this.user.on("signout", this._onUserSignout, this);
    this.user.on("signout-requested", this._onUserSignoutRequested, this);

    // port events
    this.appPort.on("talkilla.users", this._onUserListReceived, this);
    this.appPort.on("talkilla.spa-connected", this._onSPAConnected, this);
    this.appPort.on("talkilla.error", this._onError, this);
    this.appPort.on("talkilla.server-reconnection",
                 this._onServerReconnection, this);
    this.appPort.on("talkilla.chat-window-ready",
                 this._onChatWindowReady, this);
    this.appPort.on("talkilla.worker-ready", this._onWorkerReady, this);
    this.appPort.on("social.user-profile", this._onUserProfile, this);
    this.appPort.on("talkilla.reauth-needed", this._onReauthNeeded, this);

    // SPA model events
    this.spa.on("dial", this.openConversation, this);

    window.addEventListener("message", this._onSPASetup.bind(this), false);

    this.appPort.post("talkilla.sidebar-ready");

    this._setupDebugLogging();
  }

  SidebarApp.prototype._onWorkerReady = function() {
    this.appStatus.set("workerInitialized", true);
    // XXX Hide or disable the import button at the start and add a callback
    // here to show it when this completes.
    this.services.google.initialize();
  };

  SidebarApp.prototype._onUserProfile = function(userData) {
    this.user.set({nick: userData.userName});
  };

  SidebarApp.prototype._onUserSignoutRequested = function() {
    this.appPort.post("talkilla.spa-forget-credentials", "TalkillaSPA");
    this.appPort.post("talkilla.spa-disable", "TalkillaSPA");
    // XXX: we may want to synchronize this with the TkWorker#close
    // method from the shared worker.
    this.user.clear();
    this.users.reset();
  };

  SidebarApp.prototype.openConversation = function(peer) {
    this.appPort.post("talkilla.conversation-open", {peer: peer});
  };

  SidebarApp.prototype._onChatWindowReady = function() {
    this.appPort.post("talkilla.user-nick", {nick: this.user.get("nick")});
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
    // Dismiss all the reconnection messages.
    this.view.notifications.clear();

    if (this.reconnecting === true){
      app.utils.notifyUI("Reconnected to the server.", "success", 2000);
      this.reconnecting = false;
    }

    this.user.set({presence: "connected"});
    if (event && event.capabilities)
      this.spa.set({capabilities: event.capabilities});
  };

  SidebarApp.prototype._onServerReconnection = function(event) {
    // Only notify the users there is a server-connection problem after
    // trying for some time.
    if (event.attempt >= 11){
      this.reconnecting = true;
      var timeout = event.timeout / 1000;
      app.utils.notifyUI("We lost the connection with the server. " +
                         "Attempting a reconnection in " + timeout + "s...",
                         "error", event.timeout);

      // Show all the users as disconnected.
      this.view.users.each(function(user) {
        user.set("presence", "disconnected");
      });
    }
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
