/* global jQuery, Talkilla */
/**
 * Talkilla services which can hardly be handled by Backbone models.
 */
(function(app, $) {
  "use strict";

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
})(Talkilla, jQuery);
