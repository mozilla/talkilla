/* global app, sidebarApp*/
/**
 * Talkilla utilities.
 */
(function(app) {
  "use strict";

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
   * Turns urls in a text to clickable links.
   * @param  {String} text
   * @param  {Object} options
   * @return {String}
   */
  app.utils.linkify = function(text, options) {
    return (text || "").trim().split(" ").map(function(word) {
      if (/^https?:\/\//.test(word.toLowerCase()))
        return app.utils.createLink(word, options && options.attributes);
      return word;
    }).join(" ");
  };
})(app);
