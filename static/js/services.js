/* global jQuery, Talkilla, WebSocket */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, $, WebSocket) {
  "use strict";

  /**
   * WebSocket client
   * @type {WebSocket}
   */
  var ws = app.services.ws = new WebSocket(app.options.WSURL);

  // on ws connection open
  ws.onopen = function() {

  };

  // Log errors
  ws.onerror = function(error) {
    app.utils.log('WebSocket Error ' + error);
  };

  // Log messages from the server
  ws.onmessage = function(event) {
    app.utils.log('Server: ' + event.data);
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
      return cb(null,
                new app.models.User({nick: auth.nick}),
                new app.models.UserSet(auth.users));
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
})(Talkilla, jQuery, WebSocket);
