/*global Backbone*/
require(['routers/router'], function(Router) {
  new Router();
  Backbone.history.start();
});
