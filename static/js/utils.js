/*global app, sidebarApp*/
/**
 * Talkilla utilities.
 */
(function(app, _) {
  "use strict";

  /**
   * Returns a human readable format.
   *
   * @param {Integer} size Size in bytes.
   */
  app.utils.humanSize = function(size) {
    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var i = 0;
    while (size >= 1024) {
      size /= 1024;
      ++i;
    }
    return size.toFixed(1) + ' ' + units[i];
  };

  /**
   * Simple audio library.
   *
   * Usage:
   *
   *   var audioLibrary = new AudioLibrary({foo: 'foo.ogg', bar: 'bar.ogg'});
   *   audioLibrary.play('foo'); // plays foo.ogg
   *   audioLibrary.play('bar'); // plays bar.ogg
   *   audioLibrary.play('foo', 'bar'); // plays foo.ogg and bar.ogg
   *   audioLibrary.stop('foo', 'bar'); // stops foo.ogg and bar.ogg
   *
   * @param {Object} sounds Audio file definitions, in the form {name: file}
   */
  function AudioLibrary(sounds) {
    this.sounds = {};
    for (var name in (sounds || {}))
      this.sounds[name] = new Audio(sounds[name]);
  }
  app.utils.AudioLibrary = AudioLibrary;

  /**
   * Starts playing one or more registered sounds.
   * @param {*args} list of registered sounds to play
   */
  AudioLibrary.prototype.play = function() {
    [].slice.call(arguments).forEach(function(name) {
      if (name in this.sounds)
        this.sounds[name].play();
    }.bind(this));
  };

  /**
   * Stops playing one or more registered sounds.
   * @param {*args} list of registered sounds to stop
   */
  AudioLibrary.prototype.stop = function() {
    [].slice.call(arguments).forEach(function(name) {
      if (name in this.sounds) {
        this.sounds[name].pause();
        this.sounds[name].currentTime = 0;
      }
    }.bind(this));
  };

  /**
   * Enables loop to one or more registered sounds.
   * @param {*args} list of registered sounds to play
   */
  AudioLibrary.prototype.enableLoop = function() {
    [].slice.call(arguments).forEach(function(name) {
      if (name in this.sounds)
        this.sounds[name].loop = true;
    }.bind(this));
  };

  /**
   * Logs any passed argument(s) to the browser console if `app.DEBUG` is true.
   */
  app.utils.log = function() {
    if (!app.options.DEBUG)
      return;
    try {
      console.log.apply(console, arguments);
    } catch (e) {}
  };

  /**
   * Displays a notification to the end user. Available types are:
   *
   * XXX: This need to be refactored. It should not be part of
   * app.utils. Instead, consider having a Notifications collection
   * for each application (SidebarApp and ChatApp) and display
   * notifications via a view when adding a item in the collection.
   *
   * - error:   red
   * - warning: yellow (default)
   * - info:    blue
   * - success: green
   */
  app.utils.notifyUI = function(message, type) {
    var notification = new app.views.NotificationView({
      model: new app.models.Notification({
        type:    type || "warning",
        message: message
      })
    });
    sidebarApp.view.notificationsView.addNotification(notification);
    return notification;
  };

  /**
   * Creates a link element.
   *
   * Available options:
   * - attributes: HTML attributes for link tag
   *
   * @param  {String} url
   * @param  {Object} attributes
   * @return {HTMLElement}
   */
  app.utils.createLink = function(url, attributes) {
    var node = document.createElement('a');
    node.href = url;
    node.appendChild(document.createTextNode(url));
    if (attributes) {
      for (var name in attributes)
        node.setAttribute(name, attributes[name]);
    }
    return node.outerHTML;
  };

  /**
   * Escapes a text and map the urls it contains to their clickable link
   * counterparts.
   *
   * Available options:
   * - schemes: list of supported URL schemes
   * - attributes: HTML attributes for link tag
   *
   * @param  {String} text
   * @param  {Object} options
   * @return {String}
   */
  app.utils.linkify = function(text, options) {
    var schemes = ["http", "https", "ftp"]; // default schemes

    if (options && 'schemes' in options && options.schemes.length)
      schemes = options.schemes;

    function isSupportedURL(url) {
      return schemes.some(function(scheme) {
        return url.toLowerCase().indexOf(scheme + "://") === 0;
      });
    }

    return _.escape(text || "").trim().split(" ").map(function(word) {
      var raw = _.unescape(word);
      if (isSupportedURL(raw))
        return app.utils.createLink(raw, options && options.attributes);

      return word;
    }).join(" ");
  };

  /**
   * Computes the displayed size of a video inside the <video> element
   * excluding any letterboxing or pillarboxing inserted in order to
   * preserve aspect ratio.
   *
   * XXX need to define behavior for elements with 0 in boxSize
   * XXX need to define how non-integer returns are handled
   *
   * @param {Array} boxSize -- size of entire <video> element: [width, height]
   * @param {Array} streamSize -- size of the media stream: [width, height]
   *
   * @return {Array} size of the displayed video: [width, height]
   */
  app.utils.computeDisplayedVideoSize = function(boxSize, streamSize) {

    if (!streamSize[0] || !streamSize[1])
      throw new Error("streamSize width and height cannot be 0");

    var widthRatio = boxSize[0] / streamSize[0];
    var heightRatio = boxSize[1] / streamSize[1];

    var scaleFactor;
    if (widthRatio < heightRatio)
      scaleFactor = widthRatio;
    else
      scaleFactor = heightRatio;

    return [scaleFactor * streamSize[0], scaleFactor * streamSize[1]];
  };

  /**
   * Generate an id via getRandomValues.
   *
   * @return {int} the generated id as an integer
   */
  app.utils.id = function() {
    var array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0];
  };

  /**
   * Dependency validator. Passed subject should have a dependencies object
   * attached.
   *
   * @constructor
   * @param  {Object} rules Dependency rules object
   */
  app.utils.Dependencies = function Dependencies(rules) {
    this.rules = rules || {};
  };

  app.utils.Dependencies.prototype = {
    /**
     * Validates all passed values against declared dependencies.
     *
     * @param  {Object} values  The values object
     * @return {Object}         The validated values object
     * @throws {TypeError}      If validation fails
     */
    validate: function(values) {
      this._checkRequiredProperties(values);
      this._checkRequiredTypes(values);
      return values;
    },

    /**
     * Checks if any of Object values matches any of current dependency type
     * requirements.
     *
     * @param  {Object} values The values object
     * @throws {TypeError}
     */
    _checkRequiredTypes: function(values) {
      Object.keys(this.rules).forEach(function(name) {
        var types = this.rules[name];
        types = Array.isArray(types) ? types : [types];
        if (!this._dependencyMatchTypes(values[name], types)) {
          throw new TypeError(
            "invalid dependency: " + name + "; expected " +
            types.map(function(type) { return type && type.name; }).join(", "));
        }
      }, this);
    },

    /**
     * Checks if a values object owns the required keys defined in dependencies.
     * Values attached to these properties shouldn't be null nor undefined.
     *
     * @param  {Object} values The values object
     * @throws {TypeError} If any dependency is missing.
     */
    _checkRequiredProperties: function(values) {
      /*jshint eqnull:true*/
      // filter out null & undefined values
      var settedValues = Object.keys(values).filter(function(name) {
        return values[name] != null;
      });
      var diff = _.difference(Object.keys(this.rules), settedValues);
      if (diff.length > 0)
        throw new TypeError("missing required " + diff.join(", "));
    },

    /**
     * Checks if a given value matches any of the provided type requirements.
     *
     * @param  {Object} value  The value to check
     * @param  {Array}  types  The list of types to check the value against
     * @return {Boolean}
     * @throws {TypeError} If the value doesn't match any types.
     */
    _dependencyMatchTypes: function(value, types) {
      return types.some(function(Type) {
        /*jshint eqeqeq:false*/
        return typeof Type === "undefined" ||       // skip checking
               value.constructor == Type   ||       // native types
               Type.prototype.isPrototypeOf(value); // custom types
      });
    }
  };
})(app, _);
