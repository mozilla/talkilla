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

    // Incoming events
    this.port.on('talkilla.call-start', function(caller, callee) {
      this.call.set({caller: caller, callee: callee});
      this.call.start();
      // this.webrtc.offer();
    }.bind(this));

    this.port.on('talkilla.call-incoming', function(caller, callee, offer) {
      this.call.set({caller: caller, callee: callee});
      this.call.incoming();
      // this.webrtc.answer(offer);
    }.bind(this));

  };

  return ChatApp;
})(jQuery, Backbone, _);
