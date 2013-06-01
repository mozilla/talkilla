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
    this.callView = new app.views.CallView(
     { webrtc: this.webrtc, el: $("#call") });

    // Text chat
    this.textChat = new app.models.TextChat();
    this.textChatView = new app.views.TextChatView({collection: this.textChat});

    // Incoming events
    this.port.on('talkilla.call-start', this._onStartingCall.bind(this));
    this.port.on('talkilla.call-incoming', this._onIncomingCall.bind(this));
    this.port.on('talkilla.call-establishment',
                 this._onCallEstablishment.bind(this));

    this.port.postEvent('talkilla.chat-window-ready', {});

    // Outgoing events
    this.webrtc.on('offer-ready', this._onOfferReady.bind(this));
    this.webrtc.on('answer-ready', this._onAnswerReady.bind(this));
  }

  // Outgoing calls
  ChatApp.prototype._onStartingCall = function(data) {
    this.call.set({caller: data.caller, callee: data.callee});
    this.call.start();
    // XXX Assume both video and audio call for now
    // Really webrtc and calls should be set up on clicking a button
    this.webrtc.set({video: true, audio: true});
    this.webrtc.offer();
  };

  ChatApp.prototype._onCallEstablishment = function(data) {
    this.call.establish();
    this.webrtc.establish(data.answer);
  };

  // Incoming calls
  ChatApp.prototype._onIncomingCall = function(data) {
    this.call.set({caller: data.caller, callee: data.callee});
    this.call.incoming();
    // XXX Assume both video and audio call for now
    // Really webrtc and calls should be set up on clicking a button
    this.webrtc.set({video: true, audio: true});
    this.webrtc.answer(data.offer);
  };

  ChatApp.prototype._onOfferReady = function(offer) {
    var callData = {
      caller: this.call.get("caller"),
      callee: this.call.get("callee"),
      offer: offer
    };

    this.port.postEvent('talkilla.call-offer', callData);
  };

  ChatApp.prototype._onAnswerReady = function(answer) {
    var callData = {
      caller: this.call.get("caller"),
      callee: this.call.get("callee"),
      answer: answer
    };

    this.port.postEvent('talkilla.call-answer', callData);
  };

  return ChatApp;
})(jQuery, Backbone, _);
