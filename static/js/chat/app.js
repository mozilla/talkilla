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
    this.textChatView = new app.views.TextChatView({
      collection: this.textChat,
      webrtc: this.webrtc
    });

    // Incoming events
    this.port.on('talkilla.call-start', this._onStartingCall.bind(this));
    this.port.on('talkilla.call-incoming', this._onIncomingCall.bind(this));
    this.port.on('talkilla.call-establishment',
                 this._onCallEstablishment.bind(this));
    this.port.on('talkilla.call-hangup', this._onCallShutdown.bind(this));

    // Outgoing events
    this.webrtc.on('offer-ready', this._onOfferReady.bind(this));
    this.webrtc.on('answer-ready', this._onAnswerReady.bind(this));

    // Data channels
    this.webrtc.on('dc.in.message', function(event) {
      this.textChat.add(JSON.parse(event.data));
    }, this);

    this.textChat.on('entry.created', function(entry) {
      this.webrtc.send(JSON.stringify(entry));
    }, this);

    // Internal events
    window.addEventListener("unload", this._onCallHangup.bind(this));

    this.port.postEvent('talkilla.chat-window-ready', {});
  }

  // Outgoing calls
  ChatApp.prototype._onStartingCall = function(data) {
    this.call.set({id: data.caller, otherUser: data.callee});
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
    this.call.set({otherUser: data.caller, id: data.callee});
    this.call.incoming();
    // XXX Assume both video and audio call for now
    // Really webrtc and calls should be set up on clicking a button
    this.webrtc.set({video: true, audio: true});
    this.webrtc.answer(data.offer);
  };

  ChatApp.prototype._onOfferReady = function(offer) {
    var callData = {
      caller: this.call.get("id"),
      callee: this.call.get("otherUser"),
      offer: offer
    };

    this.port.postEvent('talkilla.call-offer', callData);
  };

  ChatApp.prototype._onAnswerReady = function(answer) {
    var callData = {
      caller: this.call.get("otherUser"),
      callee: this.call.get("id"),
      answer: answer
    };

    this.port.postEvent('talkilla.call-answer', callData);
  };

  // Call Hangup
  ChatApp.prototype._onCallShutdown = function() {
    this.call.hangup();
    this.webrtc.hangup();
    window.close();
  };

  ChatApp.prototype._onCallHangup = function(data) {
    var callState = this.call.state.current;
    if (callState === "ready" || callState === "terminated")
      return;

    var other = this.call.get("otherUser");
    this.call.hangup();
    this.webrtc.hangup();

    this.port.postEvent('talkilla.call-hangup', {other: other});
  };

  return ChatApp;
})(jQuery, Backbone, _);
