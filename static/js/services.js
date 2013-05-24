/* global Talkilla, Backbone, jQuery, _ */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, Backbone, $, _) {
  "use strict";

  // add event support to services
  _.extend(app.services, Backbone.Events);

  /**
   * Posts a message event to the worker
   * @param  {String} topic
   * @param  {Mixed}  data
   */
  app.services._postToWorker = function(topic, data) {
    navigator.mozSocial.getWorker().port.postMessage(
      {topic: topic, data: data});
  };

  /**
   * Social API worker port listener; exposed as a global to be reinitialized in
   * a testing environment.
   * @type {PortListener|undefined}
   */
  app.services._portListener = undefined;

  /**
   * Retrieves or initializes a PortListener object.
   * @return {PortListener}
   */
  app.services.getPortListener = function() {
    if (this._portListener)
      return this._portListener;
    var port = navigator.mozSocial.getWorker().port;
    this._portListener = new this.PortListener(port);
    return this._portListener;
  };

  /**
   * MozSocial Port listener.
   * @param  {AbstractPort} port
   */
  app.services.PortListener = function(port) {
    this.port = port;
    this.listeners = {};
    this.port.onmessage = this.onmessage.bind(this);
  };

  app.services.PortListener.prototype = {
    /**
     * Adds a topic listener.
     * @param  {String}   topic
     * @param  {Function} listener
     */
    on: function(topic, listener) {
      if (!(topic in this.listeners))
        this.listeners[topic] = [];
      this.listeners[topic].push(listener);
    },

    /**
     * Port message event listener, will call every registered listener for the
     * received topic.
     * @param  {Event} event
     */
    onmessage: function(event) {
      var topic = event.data.topic;
      var data = event.data.data;
      if (topic in this.listeners) {
        this.listeners[topic].forEach(function(listener) {
          listener(data);
        }, this);
      }
    }
  };

  app.services.getPortListener().on("talkilla.login-success", function(data) {
    app.data.user.set({nick: data.username, presence: "connected"});
  });

  app.services.getPortListener().on("talkilla.login-failure", function(error) {
    app.utils.notifyUI('Failed to login while communicating with the server: ' +
      error, 'error');
  });

  app.services.getPortListener().on("talkilla.logout-success", function() {
    app.data.user.clear();
    app.resetApp();
  });

  app.services.getPortListener().on("talkilla.error", function(error) {
    app.utils.notifyUI('Error while communicating with the server: ' +
      error, 'error');
  });

  app.services.getPortListener().on("talkilla.presence-unavailable",
    function(code) {
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
    this._postToWorker('talkilla.login', {username: nick});
  };

  /**
   * Signs a user in.
   */
  app.services.logout = function() {
    this._postToWorker('talkilla.logout');
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
})(Talkilla, Backbone, jQuery, _);
