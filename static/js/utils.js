/* global Talkilla, jQuery*/
/**
 * Talkilla utilities.
 */
(function(app, $) {
  "use strict";

  /**
   * Logs any passed argument(s) to the browser console if `app.DEBUG` is true.
   */
  app.utils.log = function() {
    if (!app.options.DEBUG)
      return;
    try {
      console.log.apply(console, arguments);
    } catch (e) {}
  };

  /**
   * Displays a notification to the end user. Available types are:
   *
   * - error
   * - warning (default)
   * - info
   * - success
   */
  app.utils.notifyUI = function(message, type) {
    type = ['info', 'success', 'error'].indexOf(type) ? type : undefined;
    // FIXME: refactor this to use a template engine
    var $notification = $(
      '<div class="alert' + (type ? ' alert-' + type : '')+ '">' +
        '<a class="close" data-dismiss="alert">&times;</a>' +
        message +
      '</div>');
    $('#messages').append($notification);
  };
})(Talkilla, jQuery);
