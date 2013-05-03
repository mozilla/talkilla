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

      // app listeners
      this.on('signout', function() {
        this.services.closeWebSocket();
      });
    }
  };

  // Add event support to the app
  _.extend(app, Backbone.Events);

  /**
   * Main app router, responsible for handling app URLs.
   */
  app.Router = Backbone.Router.extend({
    routes: {
      'call/:nick': 'call',
      '*actions':   'index'
    },

    initialize: function() {
      this.view = new app.views.AppView();
    },

    index: function() {
      this.view.render();
    },

    call: function(nick) {
      if (!app.data.user) {
        app.utils.notifyUI('Please join for calling someone');
        return this.navigate('', {trigger: true, replace: true});
      }
      var callee = app.data.users.findWhere({nick: nick});
      if (!callee) {
        return app.utils.notifyUI('User not found', 'error');
      }
      this.view.call.callee = callee;
      this.view.call.render();
    }
  });

  /**
   * Resets the app to the signed out state.
   */
  app.resetApp = function() {
    // reset all app data
    app.data = {};
    app.trigger('signout');
    app.router.navigate('', {trigger: true});
    app.router.index();
  };

  // window event listeners
  window.onbeforeunload = function() {
    if (!app.data.user)
      return;
    app.services.logout(function(err) {
      if (err)
        app.utils.log('Error occured while signing out:', err);
    });
  };

  return app;
})(jQuery, Backbone, _);
