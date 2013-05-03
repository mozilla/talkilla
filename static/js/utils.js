/* global Talkilla*/
/**
 * Talkilla utilities.
 */
(function(app) {
  "use strict";

  /**
   * Resets the app to the signed out state.
   */
  app.utils.resetApp = function() {
    // reset all app data
    app.data = {};
    app.trigger('signout');
    app.router.navigate('', {trigger: true});
    app.router.index();
  };

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
    return notification;
  };
})(Talkilla);
