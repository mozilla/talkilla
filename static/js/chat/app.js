/*global app, AppPort, WebRTC*/
/* jshint unused: false */
/**
 * Talkilla application.
 */
var ChatApp = (function(app, $, Backbone, _) {
  "use strict";

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
      call: this.call,
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
    this.user.on('signout', this._onUserSignout, this);

    // Incoming events
    this.port.on('talkilla.conversation-open',
                 this._onConversationOpen, this);
    this.port.on('talkilla.conversation-incoming',
                 this._onIncomingConversation, this);
    this.port.on('talkilla.call-establishment',
                 this._onCallEstablishment, this);
    this.port.on('talkilla.call-hangup', this._onCallShutdown, this);
    this.port.on('talkilla.user-joined', this._onUserJoined, this);
    this.port.on('talkilla.user-left', this._onUserLeft, this);

    // Outgoing events
    this.call.on('send-offer', this._onSendOffer, this);
    this.textChat.on('send-offer', this._onSendOffer, this);
    this.call.on('send-answer', this._onSendAnswer, this);
    this.textChat.on('send-answer', this._onSendAnswer, this);
    this.call.on('send-timeout', this._onSendTimeout, this);
    this.call.on('send-hangup', this._onCallHangup, this);
    this.call.on('transition:accept', this._onCallAccepted, this);

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
        .trigger('change:nick', this.peer) // force triggering change event
        .trigger('change:presence', this.peer);
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
})(app, jQuery, Backbone, _);
