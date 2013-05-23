/* global Talkilla, Backbone, jQuery, _, WebSocket */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, Backbone, $, _, WebSocket) {
  "use strict";

  // add event support to services
  _.extend(app.services, Backbone.Events);

  /**
   * Creates the "authenticated" WebSocket connection. The WebSocket service is
   * usually created once the user is authenticated.
   *
   * @param  {Object} options
   */
  app.services.startWebSocket = function(options) {
    var id = options && options.id;

    if (!id)
      throw new Error('Creating a WebSocket needs an id passed');

    /**
     * WebSocket client
     * @type {WebSocket}
     */
    app.services.ws = new WebSocket(app.options.WSURL + '?nick=' + id);

    /**
     * Error logging
     */
    app.services.ws.onerror = function(error) {
      app.utils.log('WebSocket Error ' + error);
      app.utils.notifyUI('An error occured while communicating with the ' +
                         'server.');
    };

    /**
     * Socket closing
     */
    app.services.ws.onclose = function(reason) {
      // XXX At some stage, we should be nicer than resetting everything
      // i.e. we should try and get it back again. For now, we'll just
      // notify the user so that they are aware.
      // 1000 is CLOSE_NORMAL
      if (reason.code !== 1000) {
        app.resetApp();
        app.utils.notifyUI('Sorry, the browser lost communication with ' +
                           'the server.');
      }
    };

    /**
     * Message handling; app.services triggers an event for each object key
     * received and passes the corresponding data as the first arg to the
     * listener callback
     *
     * @param {Object} event Message event
     */
    app.services.ws.onmessage = function(event) {
      var data = JSON.parse(event.data);
      for (var eventType in data) {
        app.services.trigger(eventType, data[eventType]);
      }
    };
  };

  /**
   * Closes the current WebSocket connection, if any
   */
  app.services.closeWebSocket = function() {
    if ('ws' in app.services)
      app.services.ws.close();
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
      var topic = event.topic;
      var data = event.data;
      if (topic in this.listeners) {
        this.listeners[topic].forEach(function(listener) {
          listener(data);
        }, this);
      }
    }
  };

  /**
   * Signs a user in.
   *
   * @param  {String}   nick User's nickname
   * @param  {Function} cb   Callback(error, User, UserSet)
   */
  app.services.login = function(nick, cb) {
    $.ajax({
      type: "POST",
      url: '/signin',
      data: {nick: nick},
      dataType: 'json'
    })
    .done(function(auth) {
      var user = new app.models.User({nick: auth.nick});
      // create WebSocket connection
      app.services.startWebSocket({
        id: auth.nick
      });
      return cb(null, user);
    })
    .fail(function(xhr, textStatus, error) {
      app.utils.notifyUI('Error while communicating with the server', 'error');
      return cb(error);
    });
  };

  /**
   * Signs a user in.
   *
   * @param  {Function} cb   Callback(error)
   */
  app.services.logout = function(cb) {
    $.ajax({
      type: "POST",
      url: '/signout',
      data: {nick: app.data.user && app.data.user.get('nick')},
      dataType: 'json'
    })
    .done(function(result) {
      return cb(null, result);
    })
    .fail(function(xhr, textStatus, error) {
      app.utils.notifyUI('Error while communicating with the server', 'error');
      return cb(error);
    });
  };

  /**
   * Initiates a call.
   *
   * @param  {app.models.User} callee The user to call
   * @param  {Object}          offer  JSON blob of the peer connection data to
   *                                  send to the callee.
   */
  app.services.initiateCall = function(callee, offer) {
    var call = {
      caller: app.data.user.get('nick'),
      callee: callee.get('nick'),
      offer: offer
    };

    // send call offer to the server
    app.services.ws.send(JSON.stringify({"call_offer": call}));
    app.services.trigger('call_offer', call);
  };

  /**
   * Accepts a call.
   *
   * @param  {app.models.User} caller The user emitter of the call
   * @param  {Object}          answer JSON blob of the peer connection data to
   *                                  send to the caller.
   */
  app.services.acceptCall = function(caller, answer) {
    // send call answer to the server
    app.services.ws.send(JSON.stringify({
      "call_accepted": {
        caller: caller.get('nick'),
        callee: app.data.user.get('nick'),
        answer: answer
      }
    }));
  };
})(Talkilla, Backbone, jQuery, _, WebSocket);
