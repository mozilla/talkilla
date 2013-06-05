/*global jQuery, Backbone, _*/
/* jshint unused: false */
/**
 * Sidebar application.
 */
var SidebarApp = (function($, Backbone, _) {
  "use strict";

  /**
   * Application object
   * @type {Object}
   */
  var app = window.app = {
    // default options
    options: {},

    // app modules
    data: {},
    media: {},
    models: {},
    port: {},
    utils: {},
    views: {},

    start: function(options) {
      // Create the current user model instance, as we'll always need that.
      this.data.user = new app.models.User();

      _.extend(this.options, options || {});
    }
  };

  // Add event support to the app
  _.extend(app, Backbone.Events);

  function SidebarApp() {
    this.view = new app.views.AppView();

    app.data.user.on("signout", function () {
      // Reset all app data apart from the user model, as the views rely
      // on it for change notifications, and this saves re-initializing those
      // hooks.
      var user = app.data.user;
      app.data = { user: user };
    });
  }

  // window event listeners
  window.onbeforeunload = function() {
    if (!app.data.user || !app.data.user.get("nick"))
      return;
    app.port.logout(function(err) {
      if (err)
        app.utils.log('Error occured while signing out:', err);
    });
  };

  return SidebarApp;
})(jQuery, Backbone, _);
