/*global jQuery, Backbone, _, tnetbin, WebRTC*/
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
    // XXX app.data.user probably shouldn't be global, but this is synced
    // with the sidebar so needs to be reworked at the same time.
    app.data.user = new app.models.User();
    this.peer = new app.models.User();

    this.webrtc = new WebRTC(null, {
      fake: !!(app.options && app.options.FAKE_MEDIA_STREAMS)
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
      model: this.call,
      peer: this.peer,
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

    this.view = new app.views.ConversationView({
      call: this.call,
      textChat: this.textChat,
      peer: this.peer,
      el: 'body'
    });

    // Incoming events
    this.port.on('talkilla.conversation-open',
                 this._onConversationOpen.bind(this));
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
    this.webrtc.on('dc:message-in', this._onDataChannelMessageIn.bind(this));
    this.textChat.on('add', this._onTextChatEntryCreated.bind(this));
    this.textChat.on('add', this._onFileTransferCreated.bind(this));

    // Internal events
    window.addEventListener("unload", this._onCallHangup.bind(this));

    this.port.postEvent('talkilla.chat-window-ready', {});
  }

  // Outgoing calls
  ChatApp.prototype._onConversationOpen = function(data) {
    this.peer.set({nick: data.peer});
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
    this.peer.set({nick: data.peer});
    // XXX Assume both video and audio call for now
    this.call.incoming({video: true, audio: true, offer: data.offer});
    this.audioLibrary.play('incoming');
  };

  ChatApp.prototype._onSendOffer = function(data) {
    this.port.postEvent('talkilla.call-offer', data);
    // Now start the tone, as the offer is going out.
    this.audioLibrary.play('outgoing');
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

    this.call.hangup();

    this.port.postEvent('talkilla.call-hangup', {
      peer: this.peer.get("nick")
    });
  };

  // Text chat & data channel event listeners
  ChatApp.prototype._onDataChannelMessageIn = function(event) {
    var entry;

    if (event.type === "chat:message")
      entry = new app.models.TextChatEntry(event.message);
    else if (event.type === "file:new")
      entry = new app.models.FileTransfer(event.message);
    else if (event.type === "file:chunk") {
      var chunk = tnetbin.toArrayBuffer(event.message.chunk).buffer;
      var transfer = this.textChat.findWhere({id: event.message.id});
      transfer.append(chunk);
    }

    this.textChat.add(entry);
  };

  ChatApp.prototype._onTextChatEntryCreated = function(entry) {
    // Send the message if we are the sender.
    // I we are not, the message comes from a contact and we do not
    // want to send it back.
    if (entry instanceof app.models.TextChatEntry &&
        entry.get('nick') === app.data.user.get("nick"))
      this.webrtc.send({type: "chat:message", message: entry.toJSON()});
  };

  ChatApp.prototype._onFileTransferCreated = function(entry) {
    // Check if we are the file sender. If we are not, the file
    // transfer has been initiated by the other party.
    if (!(entry instanceof app.models.FileTransfer && entry.file))
      return;

    var onFileChunk = this._onFileChunk.bind(this);
    var message = {
      id: entry.id,
      filename: entry.file.name,
      size: entry.file.size
    };
    this.webrtc.send({type: "file:new", message: message});

    entry.on("chunk", onFileChunk);
    entry.on("complete", entry.off.bind(this, "chunk", onFileChunk));

    entry.start();
  };

  ChatApp.prototype._onFileChunk = function(id, chunk) {
    this.webrtc.send({type: "file:chunk", message: {id: id, chunk: chunk}});
  };

  return ChatApp;
})(jQuery, Backbone, _);
