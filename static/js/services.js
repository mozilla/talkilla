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
    app.services.ws = new WebSocket(app.options.WSURL);

    /**
     * On connection open, immediately send a message for "authenticating" this
     * connection and attach it to the current logged in user.
     *
     * FIXME: relying on the sole user nick for authenticating the ws connection
     *        is *absolutely unsecure*.
     */
    app.services.ws.onopen = function() {
      app.services.ws.send(JSON.stringify({
        id: id // XXX a token would be a better fit here
      }));
    };

    /**
     * Error logging
     */
    app.services.ws.onerror = function(error) {
      app.utils.log('WebSocket Error ' + error);
      app.utils.notifyUI('An error occured while communicating with the ' +
                         'server.');
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
