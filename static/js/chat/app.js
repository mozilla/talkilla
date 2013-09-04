/*global jQuery, Backbone, _, AppPort, WebRTC*/
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
    this.port = new AppPort();
    this.user = new app.models.User();
    this.peer = new app.models.User();

    // Audio library
    this.audioLibrary = new app.utils.AudioLibrary({
      incoming: "/snd/incoming_call_ring.opus",
      outgoing: "/snd/outgoing_call_ring.opus"
    });

    this.webrtc = new WebRTC({
      forceFake: !!(app.options && app.options.FAKE_MEDIA_STREAMS)
    });

    this.webrtc.on("error", function(message) {
      // XXX: notify user that something went wrong
      console.error(message);
    });

    this.call = new app.models.Call({}, {
      media: this.webrtc,
      peer: this.peer
    });

    this.callControlsView = new app.views.CallControlsView({
      call: this.call,
      media: this.webrtc,
      el: $("#call-controls")
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
      call: this.call,
      peer: this.peer,
      audioLibrary: this.audioLibrary,
      el: $("#establish")
    });

    // Text chat
    // TODO: prefill the chat with history
    var history = [];

    this.textChat = new app.models.TextChat(history, {
      media: this.webrtc,
      user: this.user,
      peer: this.peer
    });

    this.textChatView = new app.views.TextChatView({
      collection: this.textChat
    });

    this.view = new app.views.ConversationView({
      call: this.call,
      textChat: this.textChat,
      peer: this.peer,
      user: this.user,
      el: 'html'
    });

    // User events
    this.user.on('signout', this._onUserSignout.bind(this));

    // Incoming events
    this.port.on('talkilla.conversation-open',
                 this._onConversationOpen.bind(this));
    this.port.on('talkilla.conversation-incoming',
                 this._onIncomingConversation.bind(this));
    this.port.on('talkilla.call-establishment',
                 this._onCallEstablishment.bind(this));
    this.port.on('talkilla.call-hangup', this._onCallShutdown.bind(this));
    this.port.on('talkilla.user-joined', this._onUserJoined.bind(this));
    this.port.on('talkilla.user-left', this._onUserLeft.bind(this));

    // Outgoing events
    this.call.on('send-offer', this._onSendOffer.bind(this));
    this.textChat.on('send-offer', this._onSendOffer.bind(this));
    this.call.on('send-answer', this._onSendAnswer.bind(this));
    this.textChat.on('send-answer', this._onSendAnswer.bind(this));
    this.call.on('send-timeout', this._onSendTimeout.bind(this));
    this.call.on('send-hangup', this._onCallHangup.bind(this));
    this.call.on('state:accept', this._onCallAccepted.bind(this));

    // Internal events
    window.addEventListener("unload", this._onWindowClose.bind(this));

    this.port.postEvent('talkilla.chat-window-ready', {});

    this._setupDebugLogging();
  }

  // Outgoing calls
  ChatApp.prototype._onConversationOpen = function(data) {
    this.user.set({nick: data.user});
    this.peer
        .set({nick: data.peer, presence: data.peerPresence}, {silent: true})
        .trigger('change:presence', this.peer); // force triggering change event
  };

  ChatApp.prototype._onCallAccepted = function() {
    this.audioLibrary.stop('incoming');
  };

  ChatApp.prototype._onCallEstablishment = function(data) {
    // text chat conversation
    if (data.textChat)
      return this.textChat.establish(data.answer);

    // video/audio call
    this.call.establish(data);
  };

  // Incoming calls
  ChatApp.prototype._onIncomingConversation = function(data) {
    this.user.set({nick: data.user});

    if (!data.upgrade)
      this.peer.set({nick: data.peer, presence: data.peerPresence});

    var options = _.extend(WebRTC.parseOfferConstraints(data.offer), {
      offer: data.offer,
      textChat: !!data.textChat,
      upgrade: !!data.upgrade
    });

    // incoming text chat conversation
    if (data.textChat)
      return this.textChat.answer(options.offer);

    // incoming video/audio call
    this.call.incoming(options);
    this.audioLibrary.play('incoming');
  };

  ChatApp.prototype._onSendOffer = function(data) {
    this.port.postEvent('talkilla.call-offer', data);
  };

  ChatApp.prototype._onSendAnswer = function(data) {
    this.port.postEvent('talkilla.call-answer', data);
  };

  ChatApp.prototype._onSendTimeout = function(data) {
    // Let the peer know that the call offer is no longer valid.
    // For this, we send call-hangup, the same as in the case where
    // the user decides to abandon the call attempt.
    this.port.postEvent('talkilla.call-hangup', data);
  };

  // Call Hangup
  ChatApp.prototype._onCallShutdown = function() {
    this.audioLibrary.stop('incoming');
    this.call.hangup(false);
    window.close();
  };

  ChatApp.prototype._onCallHangup = function(data) {
    // Send a message as this is this user's call hangup
    this.port.postEvent('talkilla.call-hangup', data);
    window.close();
  };

  ChatApp.prototype._onWindowClose = function(data) {
    var callState = this.call.state.current;
    if (callState !== "terminated")
      this.call.hangup(true);
  };

  ChatApp.prototype._onUserSignout = function() {
    // ensure this chat window is closed when the user signs out
    window.close();
  };

  ChatApp.prototype._onUserJoined = function(nick) {
    if (this.peer.get('nick') === nick)
      this.peer.set('presence', 'connected');
  };

  ChatApp.prototype._onUserLeft = function(nick) {
    if (this.peer.get('nick') === nick)
      this.peer.set('presence', 'disconnected');
  };

  // if debug is enabled, verbosely log object events to the console
  ChatApp.prototype._setupDebugLogging = function() {
    if (!app.options.DEBUG)
      return;

    // app object events logging
    ['webrtc', 'call', 'textChat'].forEach(function(prop) {
      this[prop].on("all", function() {
        var args = [].slice.call(arguments);
        console.log.apply(console, ['chatapp.' + prop].concat(args));
      });
    }, this);
  };

  return ChatApp;
})(jQuery, Backbone, _);
