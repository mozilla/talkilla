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
  var DependencyError = app.views.DependencyError =
      function DependencyError() {
        var err = Error.apply(this, arguments);
        ["message", "stack", "lineNumber", "columnNumber", "fileName"]
          .forEach(function(prop) {
            this[prop] = err[prop];
          }, this);
        this.name = 'DependencyError';
      };
  app.views.DependencyError.prototype = Object.create(Error.prototype);

  /**
   * Base Talkilla view.
   */
  app.views.BaseView = Backbone.View.extend({
    // default dependencies (none)
    dependencies: {},

    /**
     * Constructs this view, checking and attaching required dependencies.
     */
    constructor: function(options) {
      this._processDependencies(options || {});
      Backbone.View.apply(this, arguments);
    },

    /**
     * Checks an options object for required dependencies and attaches them to
     * current instance.
     * @param  {Object}   options   Options object
     * @throws {DependencyError} If object doesn't own an expected property
     */
    _processDependencies: function(options) {
      /*jshint eqnull:true*/
      var dependencyNames = Object.keys(this.dependencies || {});
      if (dependencyNames.length === 0)
        return;
      var diff = _.difference(dependencyNames,
                              Object.keys(options).filter(function(name) {
                                return options[name] != null;
                              }));
      if (diff.length > 0)
        throw new DependencyError("missing required " + diff.join(", "));
      dependencyNames.forEach(function(name) {
        var types = this.dependencies[name], option = options[name];
        types = Array.isArray(types) ? types : [types];
        var match = types.some(function(Type) {
          /*jshint eqeqeq:false*/
          return typeof Type === "undefined" ||        // skip checking
                 option.constructor == Type  ||        // native types
                 Type.prototype.isPrototypeOf(option); // custom types
        });
        if (!match) {
          throw new DependencyError(
            "invalid dependency: " + name + "; expected " +
            types.map(function(type) {
              return type && type.name;
            }).join(", "));
        }
        this[name] = option;
      }, this);
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
