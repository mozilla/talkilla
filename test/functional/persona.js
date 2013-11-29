(function(window) {
  "use strict";

  var handlers = {};

  window.navigator.id = {
    request: function() {
      var nick = $.cookie("test email");
      handlers.onlogin(nick);
    },

    logout: function() {
      $.removeCookie("test email");
      handlers.onlogout();
    },

    watch: function(callbacks) {
      handlers.onlogin = callbacks.onlogin;
      handlers.onlogout = callbacks.onlogout;
    }
  };
}(window));

