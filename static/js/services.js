/* global jQuery, Talkilla */
(function(app, $) {
  "use strict";

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
      app.log(error);
      return cb(error);
    });
  };

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
      app.log(error);
      return cb(error);
    });
  };
})(Talkilla, jQuery);
