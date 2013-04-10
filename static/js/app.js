/*global jQuery, Backbone, _*/
/* jshint unused: false */
/**
 * Talkilla application.
 */
var Talkilla = (function($, Backbone, _) {
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
    services: {},
    utils: {},
    views: {},

    start: function(options) {
      _.extend(this.options, options || {});
      this.router = new app.Router();
      Backbone.history.start();
    }
  };

  // Add event support to the app
  _.extend(app, Backbone.Events);

  /**
   * Main app router, responsible for handling app URLs.
   */
  app.Router = Backbone.Router.extend({
    routes: {
      'call/:with': 'call',
      '*actions':   'index'
    },

    initialize: function() {
      this.view = new app.views.AppView();
    },

    index: function() {
      this.view.render();
    },

    call: function(callee) {
      if (!app.data.user) {
        app.utils.notifyUI('Please join for calling someone');
        return this.navigate('', {trigger: true, replace: true});
      }
      var calleeModel = app.data.users.findWhere({nick: callee});
      if (!calleeModel) {
        return app.utils.notifyUI('User not found', 'error');
      }
      this.view.call.callee = calleeModel;
      this.view.call.render();
    }
  });

  // app listeners
  app.on('signout', function() {
    app.services.closeWebSocket();
  });

  // window event listeners
  window.onbeforeunload = function() {
    if (!app.data.user)
      return;
    app.services.logout(function(err) {
      if (err)
        app.utils.notifyUI('An error occured while signing out', 'error');
    });
  };

  return app;
})(jQuery, Backbone, _);
