/*global jQuery, Backbone, _, AppPort*/
/* jshint unused: false */
/**
 * Sidebar application.
 */
var SidebarApp = (function($, Backbone, _) {
  "use strict";

  /**
   * Application object
   * @type {Object}
   */
  var app = window.app = {
    // default options
    options: {},

    // app modules
    data: {},
    media: {},
    models: {},
    port: {},
    utils: {},
    views: {},

    start: function(options) {
      _.extend(this.options, options || {});
    }
  };

  // Add event support to the app
  _.extend(app, Backbone.Events);

  function SidebarApp(options) {
    options = options || {};

    this.port = new AppPort();

    this.user = new app.models.User({
      nick: options && options.nick
    });

    this.users = new app.models.UserSet();

    this.view = new app.views.AppView({
      user: this.user,
      users: this.users
    });

    // user events
    this.user.on("signout", this._onUserSignout.bind(this));

    // port events
    this.port.on('talkilla.users', this._onUserListReceived.bind(this));
    this.port.on("talkilla.login-success", this._onLoginSuccess.bind(this));
    this.port.on("talkilla.login-failure", this._onLoginFailure.bind(this));
    this.port.on("talkilla.logout-success", this._onLogoutSuccess.bind(this));
    this.port.on("talkilla.error", this._onError.bind(this));
    this.port.on("talkilla.presence-unavailable",
                 this._onPresenceUnavailable.bind(this));
    this.port.on("talkilla.chat-window-ready",
                 this._onChatWindowReady.bind(this));
    this.port.on('talkilla.offer-timeout', this._onOfferTimeout.bind(this));

    this.port.postEvent("talkilla.sidebar-ready", {nick: options.nick});

    this._setupDebugLogging();
  }

  SidebarApp.prototype.login = function(nick) {
    this.port.postEvent('talkilla.login', {username: nick});
  };

  SidebarApp.prototype.logout = function() {
    this.port.postEvent('talkilla.logout');
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
    $.cookie('nick', data.username, {expires: 10});
    this.user.set({nick: data.username, presence: "connected"});
  };

  SidebarApp.prototype._onLoginFailure = function(error) {
    app.utils.notifyUI('Failed to login while communicating with the server: ' +
      error, 'error');
  };

  SidebarApp.prototype._onLogoutSuccess = function() {
    $.removeCookie('nick');
    this.user.clear();
    this.users.reset();
  };

  SidebarApp.prototype._onError = function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  };

  SidebarApp.prototype._onOfferTimeout = function(callData) {
    app.utils.notifyUI("The other party, " + callData.peer +
                       ", did not respond", "error");
  };

  SidebarApp.prototype._onPresenceUnavailable = function(code) {
    // 1000 is CLOSE_NORMAL
    if (code !== 1000) {
      this.user.clear();
      app.utils.notifyUI('Sorry, the browser lost communication with ' +
                         'the server. code: ' + code);
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
    this.port.on('talkilla.debug', function(event) {
      console.log('worker event', event.label, event.data);
    });
  };

  return SidebarApp;
})(jQuery, Backbone, _);
