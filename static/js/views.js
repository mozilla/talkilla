/*global app */
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * Base notification view.
   */
  app.views.NotificationView = Backbone.View.extend({
    template: _.template([
      '<div class="alert alert-<%= type %>">',
      '  <a class="close" data-dismiss="alert">&times;</a>',
      '  <%= message %>',
      '</div>'
    ].join('')),

    clear: function() {
      this.undelegateEvents();
      this.remove();
    },

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });
})(app, Backbone, _);
