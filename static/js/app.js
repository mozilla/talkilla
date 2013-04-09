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
  var app = {
    // default options
    options: {
      DEBUG: false,
      WSURL: 'ws://127.0.0.1:5000'
    },

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

  return app;
})(jQuery, Backbone, _);
