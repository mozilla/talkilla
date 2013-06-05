/* jshint camelcase:false */
/* global app, Backbone, _ */
/**
 * Social API Worker Port wrapper & message events listener/dispatcher.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * App port object.
   * @type {Object}
   */
  app.port = app.port || {};

  // add event support to port
  _.extend(app.port, Backbone.Events);

  /**
   * Social API worker port
   * @type {AbstractPort|undefined}
   */
  app.port._port = undefined;

  /**
   * `app.port.port` property getter; will retrieve, configure, store and
   * return the current Social API worker port, if any.
   * @return {AbstractPort|undefined}
   */
  app.port.__defineGetter__('port', function() {
    if (this._port)
      return this._port;

    this._port = navigator.mozSocial.getWorker().port;

    // Register Social API message handler
    this._port.onmessage = function(event) {
      this.trigger(event.data.topic, event.data.data);
    }.bind(this);

    return this._port;
  });

  /**
   * Posts a message to the Social API Worker.
   * @param  {String} topic
   * @param  {Mixed}  data
   */
  app.port.postEvent = function(topic, data) {
    this.port.postMessage({topic: topic, data: data});
  };

  app.port.on("talkilla.login-success", function(data) {
    app.data.user.set({nick: data.username, presence: "connected"});
  });

  app.port.on("talkilla.login-failure", function(error) {
    app.utils.notifyUI('Failed to login while communicating with the server: ' +
      error, 'error');
  });

  app.port.on("talkilla.logout-success", function() {
    app.data.user.clear();
  });

  app.port.on("talkilla.error", function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  });

  app.port.on("talkilla.presence-unavailable", function(code) {
    // 1000 is CLOSE_NORMAL
    if (code !== 1000) {
      app.data.user.clear();
      app.utils.notifyUI('Sorry, the browser lost communication with ' +
                         'the server. code: ' + code);
    }
  });

  /**
   * Signs a user in.
   *
   * @param  {String}   nick User's nickname
   */
  app.port.login = function(nick) {
    this.postEvent('talkilla.login', {username: nick});
  };

  /**
   * Signs a user in.
   */
  app.port.logout = function() {
    this.postEvent('talkilla.logout');
  };
})(app, Backbone, _);
