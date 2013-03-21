require([
  'backbone',
  'routers/router'
], function(Backbone, Router) {
  window.Talkilla = new Router();
  Backbone.history.start();
});
