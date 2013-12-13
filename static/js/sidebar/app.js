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
    this.appPort.on('talkilla.users', this._onUserListReceived, this);
    this.appPort.on("talkilla.spa-connected", this._onSPAConnected, this);
    this.appPort.on("talkilla.error", this._onError, this);
    this.appPort.on("talkilla.spa-error", this._onSPAError, this);
    this.appPort.on("talkilla.presence-unavailable",
                 this._onPresenceUnavailable, this);
    this.appPort.on("talkilla.chat-window-ready",
                 this._onChatWindowReady, this);
    this.appPort.on("talkilla.worker-ready", this._onWorkerReady, this);
    this.appPort.on("social.user-profile", this._onUserProfile, this);
    this.appPort.on('talkilla.reauth-needed', this._onReauthNeeded, this);

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
    this.appPort.post('talkilla.conversation-open', {peer: peer});
  };

  SidebarApp.prototype._onChatWindowReady = function() {
    this.appPort.post('talkilla.user-nick', {nick: this.user.get('nick')});
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
    this.user.set({presence: "connected"});
    if (event && event.capabilities)
      this.spa.set({capabilities: event.capabilities});
  };

  // XXX a lot of the steps that happen after various types of logouts and
  // failures are very very similar but not the same, and I suspect some
  // of this is intentional, and some of it is not.  One of the consequences
  // here is that the app itself can be left in a whole variety of mostly
  // similar but non-identical states.  My guess is that there should really
  // only be one or two states possible.  This needs some factoring out.
  // However, I suspect the factoring is going to be meaningfully effected by
  // our efforts to retry connections much of the time, so it probably makes
  // sense to do it as part of that card.

  SidebarApp.prototype._onError = function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  };

  SidebarApp.prototype._onSPAError = function(error) {
    app.utils.notifyUI('Error while communicating with the Server: ' +
      error, 'error');
    this.user.clear();
  };

  SidebarApp.prototype._onPresenceUnavailable = function(code) {
    // 1000 is CLOSE_NORMAL, meaning that the app itself called close(),
    // (e.g. because the user clicked on logout), so there's no error
    // here.
    if (code !== 1000) {
      this.user.clear();
      app.utils.notifyUI('Sorry, the browser lost communication with ' +
                         'the server. CloseEvent code: ' + code);
    }
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
    this.appPort.on('talkilla.debug', function(event) {
      console.log('worker event', event.label, event.data);
    });
  };

  return SidebarApp;
})(app, jQuery);
