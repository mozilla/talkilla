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
    DEBUG: false,
    data: {},
    models: {},
    services: {},
    utils: {},
    views: {},

    start: function() {
      this.router = new app.Router();

      // app events
      this.on('signout', function() {
        // make sure any call is terminated on user signout
        this.router.callView.hangup();
      });

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

    updateViews: function() {
      // TODO: if this keeps growing, refactor as a view pool
      // login form
      if (this.loginView)
        this.loginView.undelegateEvents();
      this.loginView = new app.views.LoginView(app.data);
      this.loginView.render();
      // users list
      if (this.usersView)
        this.usersView.undelegateEvents();
      this.usersView = new app.views.UsersView(app.data);
      this.usersView.render();
      // call view
      if (this.callView)
        this.callView.undelegateEvents();
      this.callView = new app.views.CallView(app.data);
      this.callView.render();
    },

    index: function() {
      this.updateViews();
    },

    call: function(callee) {
      if (!app.data.user) {
        app.utils.notifyUI('Please join for calling someone');
        return this.navigate('', {trigger: true, replace: true});
      }
      app.data.callee = app.data.users.findWhere({nick: callee});
      if (!app.data.callee) {
        return app.utils.notifyUI('User not found', 'error');
      }
      this.updateViews();
    }
  });

  return app;
})(jQuery, Backbone, _);
