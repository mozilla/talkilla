/* jshint camelcase:false */
/* global Talkilla, Backbone, _ */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * App services object.
   * @type {Object}
   */
  app.services = app.services || {};

  // add event support to services
  _.extend(app.services, Backbone.Events);

  /**
   * Social API worker port
   * @type {AbstractPort|undefined}
   */
  app.services._port = undefined;

  /**
   * `app.services.port` property getter; will retrieve, configure, store and
   * return the current Social API worker port, if any.
   * @return {AbstractPort|undefined}
   */
  app.services.__defineGetter__('port', function() {
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
  app.services.postEvent = function(topic, data) {
    this.port.postMessage({topic: topic, data: data});
  };

  app.services.on("talkilla.login-success", function(data) {
    app.data.user.set({nick: data.username, presence: "connected"});
  });

  app.services.on("talkilla.login-failure", function(error) {
    app.utils.notifyUI('Failed to login while communicating with the server: ' +
      error, 'error');
  });

  app.services.on("talkilla.logout-success", function() {
    app.data.user.clear();
    app.resetApp();
  });

  app.services.on("talkilla.error", function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  });

  app.services.on("talkilla.presence-unavailable", function(code) {
    // 1000 is CLOSE_NORMAL
    if (code !== 1000) {
      app.resetApp();
      app.utils.notifyUI('Sorry, the browser lost communication with ' +
                         'the server. code: ' + code);
    }
  });

  /**
   * Signs a user in.
   *
   * @param  {String}   nick User's nickname
   */
  app.services.login = function(nick) {
    this.postEvent('talkilla.login', {username: nick});
  };

  /**
   * Signs a user in.
   */
  app.services.logout = function() {
    this.postEvent('talkilla.logout');
  };

  /**
   * Initiates a call.
   *
   * @param  {app.models.User} callee The user to call
   * @param  {Object}          offer  JSON blob of the peer connection data to
   *                                  send to the callee.
   */
  app.services.initiateCall = function(callee, offer) {
    // XXX to be replaced
    /* jshint unused:false */
    /*
    var call = {
      caller: app.data.user.get('nick'),
      callee: callee.get('nick'),
      offer: offer
    };

    // send call offer to the server
    app.services.ws.send(JSON.stringify({"call_offer": call}));
    app.services.trigger('call_offer', call);
    */
  };

  /**
   * Accepts a call.
   *
   * @param  {app.models.User} caller The user emitter of the call
   * @param  {Object}          answer JSON blob of the peer connection data to
   *                                  send to the caller.
   */
  app.services.acceptCall = function(caller, answer) {
    // XXX to be replaced
    /* jshint unused:false */
    // send call answer to the server
    /*
    app.services.ws.send(JSON.stringify({
      "call_accepted": {
        caller: caller.get('nick'),
        callee: app.data.user.get('nick'),
        answer: answer
      }
    }));
    */
  };
})(Talkilla, Backbone, _);
