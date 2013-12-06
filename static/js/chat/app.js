/*global app, AppPort, WebRTC*/
/* jshint unused: false */
/**
 * Talkilla application.
 */
var ChatApp = (function(app, $, Backbone, _) {
  "use strict";

  function ChatApp() {
    this.appPort = new AppPort();
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
    this.appPort.on('talkilla.conversation-open',
                 this._onConversationOpen, this);
    this.appPort.on('talkilla.conversation-incoming',
                 this._onIncomingConversation, this);
    this.appPort.on('talkilla.call-establishment',
                 this._onCallEstablishment, this);
    this.appPort.on('talkilla.call-hangup', this._onCallShutdown, this);
    this.appPort.on('talkilla.ice-candidate', this._onIceCandidate, this);
    this.appPort.on('talkilla.user-joined', this._onUserJoined, this);
    this.appPort.on('talkilla.user-left', this._onUserLeft, this);
    this.appPort.on('talkilla.move-accept', this._onMoveAccept, this);
    this.appPort.on('talkilla.hold', this._onHold, this);
    this.appPort.on('talkilla.resume', this._onResume, this);

    // Outgoing events
    this.call.on('send-offer', this._onSendOffer, this);
    this.textChat.on('send-offer', this._onSendOffer, this);
    this.call.on('send-answer', this._onSendAnswer, this);
    this.textChat.on('send-answer', this._onSendAnswer, this);
    this.call.on('send-timeout', this._onSendTimeout, this);
    this.call.on('send-hangup', this._onCallHangup, this);
    this.call.on('transition:accept', this._onCallAccepted, this);
    this.call.on('initiate-move', this._onInitiateMove, this);
    // As we can get ice candidates for calls or text chats, just get this
    // straight from the media model.
    this.webrtc.on('ice:candidate-ready', this._onIceCandidateReady, this);

    // Internal events
    window.addEventListener("unload", this._onWindowClose.bind(this));

    this.appPort.post('talkilla.chat-window-ready', {});

    this._setupDebugLogging();
  }

  // Outgoing calls

  /**
   * Listens to the `talkilla.conversation-open` event.
   * @param {Object} msg Conversation msg object.
   */
  ChatApp.prototype._onConversationOpen = function(msg) {
    this.call.set({capabilities: msg.capabilities});
    this.user.set({nick: msg.user});
    this.peer
        .set({nick: msg.peer, presence: msg.peerPresence},
             {silent: true})
        .trigger('change:nick', this.peer) // force triggering change event
        .trigger('change:presence', this.peer);
  };

  ChatApp.prototype._onCallAccepted = function() {
    this.audioLibrary.stop('incoming');
  };

  ChatApp.prototype._onInitiateMove = function(moveMsg) {
    this.appPort.post('talkilla.initiate-move', moveMsg.toJSON());
  };

  ChatApp.prototype._onCallEstablishment = function(data) {
    var sdp = new WebRTC.SDP(data.answer.sdp);

    // text chat conversation
    if (sdp.only("datachannel"))
      return this.textChat.establish(data.answer);

    // video/audio call
    this.call.establish(data);
  };

  // Incoming calls
  ChatApp.prototype._onIncomingConversation = function(msg) {
    var sdp = new WebRTC.SDP(msg.offer.offer.sdp);

    this.call.set({capabilities: msg.capabilities});
    this.user.set({nick: msg.user});

    if (!msg.offer.upgrade)
      this.peer.set({nick: msg.peer, presence: msg.peerPresence});

    // incoming text chat conversation
    if (sdp.only("datachannel"))
      return this.textChat.answer(msg.offer.offer);

    // incoming video/audio call
    this.call.incoming(new app.payloads.Offer(msg.offer));
    this.audioLibrary.play('incoming');
  };

  ChatApp.prototype._onIceCandidate = function(data) {
    this.webrtc.addIceCandidate(data.candidate);
  };

  /**
   * Called when initiating a call.
   *
   * @param {payloads.Offer} offerMsg the offer to send to initiate the call.
   */
  ChatApp.prototype._onSendOffer = function(offerMsg) {
    this.appPort.post('talkilla.call-offer', offerMsg);
  };

  /**
   * Called when accepting an incoming call.
   *
   * @param {payloads.Answer} answerMsg the answer to send to accept the call.
   */
  ChatApp.prototype._onSendAnswer = function(answerMsg) {
    this.appPort.post('talkilla.call-answer', answerMsg);
  };

  /**
   * Called when a call times out.
   *
   * @param {payloads.Hanging} hangupMsg the hangup to send to stop
   * the call.
   *
   */
  ChatApp.prototype._onSendTimeout = function(hangupMsg) {
    // Let the peer know that the call offer is no longer valid.
    // For this, we send call-hangup, the same as in the case where
    // the user decides to abandon the call attempt.
    this.appPort.post('talkilla.call-hangup', hangupMsg);
  };

  /**
   * Called to send an ice candidate to the peer.
   *
   * @param {mozRTCIceCandidate} The ICE Candidate to send.
   */
  ChatApp.prototype._onIceCandidateReady = function(candidate) {
    var iceCandidateMsg = new app.payloads.IceCandidate({
      peer: this.peer.get("nick"),
      candidate: candidate
    });
    this.appPort.post('talkilla.ice-candidate', iceCandidateMsg);
  };

  /**
   * Called when a call move request is accepted.
   *
   * @param {Object} moveAcceptData a data structure representing
   * payloads.MoveAccept
   */
  ChatApp.prototype._onMoveAccept = function(moveAcceptData) {
    var moveAcceptMsg = new app.payloads.MoveAccept(moveAcceptData);
    if (moveAcceptMsg.callid === this.call.callid)
      this.call.hangup(false);
  };

  /**
   * Called to put a call on hold.
   *
   * @param {Object} holdData a data structure representing
   * payloads.Hold
   */
  ChatApp.prototype._onHold = function(holdData) {
    var holdMsg = new app.payloads.Hold(holdData);
    if (holdMsg.callid === this.call.callid)
      this.call.hold();
  };

  /**
   * Called to resume a call.
   *
   * @param {Object} resumeData a data structure representing
   * payloads.Resume
   */
  ChatApp.prototype._onResume = function(resumeData) {
    var resumeMsg = new app.payloads.Resume(resumeData);
    if (resumeMsg.callid === this.call.callid)
      this.call.resume(resumeMsg.media.video);
  };

  // Call Hangup
  ChatApp.prototype._onCallShutdown = function(hangupData) {
    var hangupMsg = new app.payloads.Hangup(hangupData);
    if (hangupMsg.callid !== this.call.callid)
      return;

    this.audioLibrary.stop('incoming');
    this.call.hangup(false);
    window.close();
  };

  /**
   * Called when hanging up a call.
   *
   * @param {payloads.Hanging} hangupMsg the hangup to send to stop
   * the call.
   *
   */
  ChatApp.prototype._onCallHangup = function(hangupMsg) {
    // Send a message as this is this user's call hangup
    this.appPort.post('talkilla.call-hangup', hangupMsg);
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
