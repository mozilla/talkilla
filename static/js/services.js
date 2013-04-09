/* global Talkilla, Backbone, jQuery, _, WebSocket */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, Backbone, $, _, WebSocket) {
  "use strict";

  // add event support to services
  _.extend(app.services, Backbone.Events);

  /**
   * WebSocket client
   * @type {WebSocket}
   */
  var ws = app.services.ws = new WebSocket(app.options.WSURL);

  /**
   * Error logging
   */
  ws.onerror = function(error) {
    app.utils.log('WebSocket Error ' + error);
    app.utils.notifyUI('An error occured while communicating with the server.');
  };

  /**
   * Message handling; app.services triggers an event for each object key
   * received and passes the corresponding data as the first arg to the listener
   * callback
   *
   * @param {Object} event Message event
   */
  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    for (var eventType in data) {
      app.services.trigger(eventType, data[eventType]);
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
      return cb(null, new app.models.User({nick: auth.nick}));
    })
    .fail(function(xhr, textStatus, error) {
      app.utils.log(error);
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
      app.utils.log(error);
      return cb(error);
    });
  };

  /**
   * Initiates a call
   *
   * @param  {String}   callee The user to call
   * @param  {Object}   offer  JSON blob of the peer connection data to send to
   *                           the callee.
   * @param  {Function} cb     Callback(error)
   */
  app.services.initiateCall = function(callee, offer, cb) {
    // XXX To do as another user story
    return cb(null, "ok");
  };

})(Talkilla, Backbone, jQuery, _, WebSocket);
