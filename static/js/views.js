/*global app*/
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _) {
  "use strict";

  /**
   * View required option error.
   * @param {String} msg Error message
   */
  app.views.ViewOptionError = function ViewOptionError() {
    var err = Error.apply(this, arguments);
    ["message", "stack", "lineNumber", "columnNumber", "fileName"]
      .forEach(function(prop) {
        this[prop] = err[prop];
      }, this);
    this.name = 'ViewOptionError';
  };
  app.views.ViewOptionError.prototype = Object.create(Error.prototype);

  /**
   * Base Talkilla view.
   */
  app.views.BaseView = Backbone.View.extend({
    /**
     * Checks that an options object owns properties passed as arguments.
     * @param  {Object}   options   Options object
     * @param  {[]String}           Property names as remaining arguments
     * @return {Object}             Checked options object
     * @throws {ViewOptionError} If object doesn't own an expected property
     */
    checkOptions: function(options) {
      options = options || {};
      var requirements = [].slice.call(arguments, 1);
      var diff = _.difference(requirements, Object.keys(options));
      if (diff.length > 0)
        throw new app.views.ViewOptionError("missing required options: " +
                                            diff.join(", "));
      return options;
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
