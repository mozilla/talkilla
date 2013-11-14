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

    this.appStatus = new app.models.AppStatus();

    this.port = new AppPort();

    this.user = new app.models.CurrentUser();

    this.users = new app.models.UserSet();

    this.services = {
      google: new GoogleContacts({
        port: this.port
      })
    };

    this.view = new app.views.AppView({
      appStatus: this.appStatus,
      user: this.user,
      users: this.users,
      services: this.services
    });

    // user events
    this.user.on("signout", this._onUserSignout, this);
    this.user.on("signin-requested", this._onUserSigninRequested, this);
    this.user.on("signout-requested", this._onUserSignoutRequested, this);

    // port events
    this.port.on('talkilla.users', this._onUserListReceived, this);
    this.port.on("talkilla.spa-connected", this._onSPAConnected, this);
    this.port.on("talkilla.error", this._onError, this);
    this.port.on("talkilla.websocket-error", this._onWebSocketError, this);
    this.port.on("talkilla.presence-unavailable",
                 this._onPresenceUnavailable, this);
    this.port.on("talkilla.chat-window-ready",
                 this._onChatWindowReady, this);
    this.port.on("talkilla.worker-ready", this._onWorkerReady, this);
    this.port.on('talkilla.reauth-needed', this._onReauthNeeded, this);

    this.port.postEvent("talkilla.sidebar-ready");

    this._setupDebugLogging();
  }

  SidebarApp.prototype._onWorkerReady = function() {
    this.appStatus.set("workerInitialized", true);
    // XXX Hide or disable the import button at the start and add a callback
    // here to show it when this completes.
    this.services.google.initialize();

    var specs = localStorage.getItem("enabled-spa");
    specs = specs ? JSON.parse(specs) : [];
    specs.forEach(function(data) {
      var spec = new app.payloads.SPASpec(data);
      this.user.set({nick: spec.credentials.email});
      this.port.postEvent("talkilla.spa-enable", spec.toJSON());
    }.bind(this));
  };

  SidebarApp.prototype._onUserSigninRequested = function(assertion) {
    this.http.post("/signin", {assertion: assertion}, function(err, response) {
      if (err)
        return this._onLoginFailure(err);

      return this._onLoginSuccess(JSON.parse(response));
    }.bind(this));
  };

  SidebarApp.prototype._onUserSignoutRequested = function() {
    this.http.post("/signout", {}, this._onLogoutSuccess.bind(this));
  };

  SidebarApp.prototype.openConversation = function(nick) {
    this.port.postEvent('talkilla.conversation-open', {
      user: this.user.get('nick'),
      peer: nick
    });
  };

  SidebarApp.prototype._onChatWindowReady = function() {
    this.port.postEvent('talkilla.user-nick', {nick: this.user.get('nick')});
  };

  SidebarApp.prototype._onLoginSuccess = function(data) {
    // We are successfuly logged in, we setup the SPA and ask to be
    // connected.
    var talkillaSpec = new payloads.SPASpec({
      src: "/js/spa/talkilla_worker.js",
      credentials: {email: data.nick}
    });
    localStorage.setItem("enabled-spa",
                         JSON.stringify([talkillaSpec.toJSON()]));

    this.user.set({nick: data.nick});
    this.port.postEvent("talkilla.spa-enable", talkillaSpec.toJSON());
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

  SidebarApp.prototype._onLoginFailure = function(error) {
    app.utils.notifyUI('Failed to login while communicating with the server: ' +
      error, 'error');
    navigator.id.logout();
  };

  SidebarApp.prototype._onLogoutSuccess = function() {
    $.removeCookie('nick');
    this.user.clear();
    this.users.reset();
  };

  SidebarApp.prototype._onSPAConnected = function() {
    this.user.set({presence: "connected"});
    this.port.postEvent("talkilla.presence-request");
  };

  SidebarApp.prototype._onError = function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  };

  SidebarApp.prototype._onWebSocketError = function(error) {
    app.utils.notifyUI('Error while communicating with the WebSocket server: ' +
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

  SidebarApp.prototype._onReauthNeeded = function() {
    app.utils.notifyUI("You need to sign in", "error");
  };

  SidebarApp.prototype._setupDebugLogging = function() {
    if (!app.options.DEBUG)
      return;

    // worker port events logging
    this.port.on('talkilla.debug', function(event) {
      console.log('worker event', event.label, event.data);
    });
  };

  return SidebarApp;
})(app, jQuery);
