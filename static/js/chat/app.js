/*global jQuery, Backbone, _*/
/* jshint unused: false */
/**
 * Talkilla application.
 */
var ChatApp = (function($, Backbone, _) {
  "use strict";

  /**
   * Application object
   * @type {Object}
   */
  window.app = {
    // default options
    options: {},

    // app modules
    models: {},
    port: {}
  };


  var ChatApp = function() {
    this.call = new app.models.Call();
    this.port = app.port;
    // this.webrtc = new app.models.WebRTCCall();
    // this.callView = new app.view.CallView({model: this.call, webrtc: this.webrtc});

    this.port.postEvent('talkilla.chat-window-ready', {});
  };

  return ChatApp;
})(jQuery, Backbone, _);
