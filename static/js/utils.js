/* global app, _, sidebarApp*/
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
    while(size >= 1024) {
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
    sidebarApp.view.notifications.addNotification(notification);
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
})(app, _);
