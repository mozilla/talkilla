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
    data: {},
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
    app.data.user = new app.models.User();

    this.webrtc = new app.models.WebRTCCall({
      fake: !!(app.options && app.options.FAKE_MEDIA_STREAMS)
    });

    this.call = new app.models.Call({}, {
      media: this.webrtc
    });

    this.view = new app.views.ChatView({
      call: this.call
    });

    this.callView = new app.views.CallView({
      call: this.call,
      el: $("#call")
    });

    this.callOfferView = new app.views.CallOfferView({
      call: this.call,
      el: $("#offer")
    });

    this.callEstablishView = new app.views.CallEstablishView({
      model: this.call,
      el: $("#establish")
    });

    // Audio library
    this.audioLibrary = new app.utils.AudioLibrary({
      incoming: "/snd/incoming_call_ring.opus",
      outgoing: "/snd/outgoing_call_ring.opus"
    });

    // Text chat
    this.textChat = new app.models.TextChat();
    this.textChatView = new app.views.TextChatView({
      collection: this.textChat,
      call: this.call
    });

    // Incoming events
    this.port.on('talkilla.call-start', this._onStartingCall.bind(this));
    this.port.on('talkilla.call-incoming', this._onIncomingCall.bind(this));
    this.port.on('talkilla.call-establishment',
                 this._onCallEstablishment.bind(this));
    this.port.on('talkilla.call-hangup', this._onCallShutdown.bind(this));

    // Outgoing events
    this.call.on('send-offer', this._onSendOffer.bind(this));
    this.call.on('send-answer', this._onSendAnswer.bind(this));
    this.call.on('offer-timeout', this._onCallOfferTimout.bind(this));

    // Internal events
    this.call.on('state:accept', this._onCallAccepted.bind(this));

    // Data channels
    this.webrtc.on('dc.in.message', this._onDataChannelMessageIn.bind(this));
    this.textChat.on('entry.created', this._onTextChatEntryCreated.bind(this));

    // Internal events
    window.addEventListener("unload", this._onCallHangup.bind(this));

    this.port.postEvent('talkilla.chat-window-ready', {});
  }

  // Outgoing calls
  ChatApp.prototype._onStartingCall = function(data) {
    // XXX Assume both video and audio call for now
    // Really webrtc and calls should be set up on clicking a button
    data.video = true;
    data.audio = true;
    this.call.start(data);
    this.audioLibrary.play('outgoing');
  };

  ChatApp.prototype._onCallAccepted = function() {
    this.audioLibrary.stop('incoming');
  };

  ChatApp.prototype._onCallEstablishment = function(data) {
    this.call.establish(data);
  };

  ChatApp.prototype._onCallOfferTimout = function(callData) {
    this.port.postEvent('talkilla.offer-timeout', callData);
    this.audioLibrary.stop('outgoing');
  };

  // Incoming calls
  ChatApp.prototype._onIncomingCall = function(data) {
    // XXX Assume both video and audio call for now
    data.video = true;
    data.audio = true;
    this.call.incoming(data);
    this.audioLibrary.play('incoming');
  };

  ChatApp.prototype._onSendOffer = function(data) {
    this.port.postEvent('talkilla.call-offer', data);
  };

  ChatApp.prototype._onSendAnswer = function(data) {
    this.port.postEvent('talkilla.call-answer', data);
  };

  // Call Hangup
  ChatApp.prototype._onCallShutdown = function() {
    this.audioLibrary.stop('incoming', 'outgoing');
    this.call.hangup();
    window.close();
  };

  ChatApp.prototype._onCallHangup = function(data) {
    var callState = this.call.state.current;
    if (callState === "ready" || callState === "terminated")
      return;

    var other = this.call.get("otherUser");
    this.call.hangup();

    this.port.postEvent('talkilla.call-hangup', {other: other});
  };

  // Text chat & data channel event listeners
  ChatApp.prototype._onDataChannelMessageIn = function(event) {
    var data = JSON.parse(event.data);

    data.message = app.utils.stripHTML(data.message);

    this.textChat.add(data);
  };

  ChatApp.prototype._onTextChatEntryCreated = function(entry) {
    this.webrtc.send(JSON.stringify(entry));
  };

  return ChatApp;
})(jQuery, Backbone, _);
