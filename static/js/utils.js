/* global Talkilla*/
/**
 * Talkilla utilities.
 */
(function(app) {
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
   * - error:   red
   * - warning: yellow (default)
   * - info:    blue
   * - success: green
   */
  app.utils.notifyUI = function(message, type) {
    var notification = new app.views.NotificationView({
      model: new app.models.Notification({
        type:    type || "warning",
        message: message
      })
    });
    app.router.view.notifications.addNotification(notification);
  };
})(Talkilla);
