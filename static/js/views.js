/*global app*/
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * Base Talkilla view.
   */
  app.views.BaseView = Backbone.View.extend({
    // default dependencies (none)
    dependencies: {},

    /**
     * Constructs this view, checking and attaching required dependencies.
     *
     * @param  {Object} options Options object
     * @throws {TypeError} If dependency checks fails
     */
    constructor: function(options) {
      new app.utils.Dependencies(this).checkAll(options || {});
      Backbone.View.apply(this, arguments);
    }
  });

  /**
   * Base notification view.
   */
  app.views.NotificationView = app.views.BaseView.extend({
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
