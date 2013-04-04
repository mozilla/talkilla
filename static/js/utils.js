/* global Talkilla, jQuery*/
(function(app, $) {
  "use strict";

  // FIXME: refactor this to use a template engine
  app.utils.notifyUI = function(message, type) {
    type = ['info', 'success', 'error'].indexOf(type) ? type : undefined;
    var $notification = $(
      '<div class="alert' + (type ? ' alert-' + type : '')+ '">' +
        '<a class="close" data-dismiss="alert">&times;</a>' +
        message +
      '</div>');
    $('#messages').append($notification);
  };
})(Talkilla, jQuery);
