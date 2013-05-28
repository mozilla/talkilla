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
  var app = window.app = {
    // default options
    options: {},

    // app modules
    models: {},
    port: {},
    media: {},
    views: {},
    utils: {},

    start: function(options) {
      _.extend(this.options, options || {});
    }
  };


  function ChatApp() {
    this.port = app.port;
    this.call = new app.models.Call();
    this.webrtc = new app.models.WebRTCCall();

    // Incoming events
    this.port.on('talkilla.call-start', this._onCallStart.bind(this));

    this.port.on('talkilla.call-incoming', function(caller, callee, offer) {
      this.call.set({caller: caller, callee: callee});
      this.call.incoming();
      // this.webrtc.answer(offer);
    }.bind(this));

    this.port.on('talkilla.call-established', function(answer) {
      this.call.establish();
      this.webrtc.answer(offer);
    }.bind(this));

    // Outgoing events
    this.webrtc.on('sdp', function(sdp) {
      if (sdp.offer)
        this.port.postEvent('talkilla.call-offer', sdp);
      else if (sdp.answer)
        this.port.postEvent('talkilla.call-answer', sdp);
    });

    this.port.postEvent('talkilla.chat-window-ready', {});
  }

  ChatApp.prototype._onCallStart = function(caller, callee) {
    this.call.set({caller: caller, callee: callee});
    this.call.start();
  };

  return ChatApp;
})(jQuery, Backbone, _);
