define(['backbone'], function(Backbone) {
  return Backbone.Model.extend({
    urlRoot: '/user',
    defaults: {
      nick: undefined
    }
  });
});
