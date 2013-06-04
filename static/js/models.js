/* global app, Backbone, StateMachine,
   mozRTCPeerConnection, mozRTCSessionDescription */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine) {
  "use strict";

  app.models.Call = Backbone.Model.extend({
    initialize: function() {
      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',   to: 'pending'},
          {name: 'establish', from: 'pending', to: 'ongoing'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',   to: 'pending'},
          {name: 'accept',    from: 'pending', to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',       to: 'terminated'}
        ]
      });

      this.start     = this.state.start.bind(this.state);
      this.incoming  = this.state.incoming.bind(this.state);
      this.accept    = this.state.accept.bind(this.state);
      this.establish = this.state.establish.bind(this.state);
      this.hangup    = this.state.hangup.bind(this.state);
    }
  });

  /*
    WebRTC call model

    @class WebRTCCall
    @constructor

    Fired when a SDP offer is available (see #offer).
    @event offer-ready
    @param {SDP offer}

    Fired when a SDP answer is available (see #answer).
    @event answer-ready
    @param {SDP answer}


    Example:

    var webrtc = new app.models.WebRTCCall();

    // Caller side
    webrtc.on('offer-ready', function(offer) {
      sendOffer(offer);
    });
    webrtc.offer()

    // Callee side
    webrtc.on('answer-ready', function(answer) {
      sendAnswer(answer);
    }
    webrtc.answer(offer);

    // Once the caller receive the answer
    webrtc.establish(answer)

    // Both sides
    webrtc.on("change:localStream", function() {
      localVideo.mozSrcObject = webrtc.get("localStream");
      localVideo.play();
    });
    webrtc.on("change:remoteStream", function() {
      remoteVideo.mozSrcObject = webrtc.get("remoteStream");
      remoteVideo.play();
    });

  */
  app.models.WebRTCCall = Backbone.Model.extend({
    initialize: function() {
      this.pc = new mozRTCPeerConnection();
      this.pc.onaddstream = function (event) {
        this.set("remoteStream", event.stream);
      }.bind(this);

      this._onError = this._onError.bind(this);
    },

    /*
      Create a SDP offer after calling getUserMedia. In case of
      success, it triggers an offer-ready event with the created offer.
    */
    offer: function() {
      var callback = this.trigger.bind(this, "offer-ready");
      this._getMedia(this._createOffer.bind(this, callback), this._onError);
    },

    /*
      Establish a WebRTC p2p connection.
      @param {SDP Answer} answer
    */
    establish: function(answer) {
      var answerDescription = new mozRTCSessionDescription(answer);
      var cb = function() {};
      this.pc.setRemoteDescription(answerDescription, cb, this._onError);
    },

    /*
      Create a SDP answer after calling getUserMedia. In case of
      success, it triggers an answer-ready event with the created answer.
      @param {SDP Offer} the offer to respond to
    */
    answer: function(offer) {
      var callback = this.trigger.bind(this, "answer-ready");
      var createAnswer = this._createAnswer.bind(this, offer, callback);
      this._getMedia(createAnswer, this._onError);
    },

    /*
      Close the p2p connection.
    */
    hangup: function() {
      this.pc.close();
    },

    _createOffer: function(callback) {
      if (!this.get('video') && !this.get('audio'))
        return this._onError("Call type has not been defined");

      this.pc.createOffer(function(offer) {
        var cb = callback.bind(this, offer);
        this.pc.setLocalDescription(offer, cb, this._onError);
      }.bind(this), this._onError);
    },

    _createAnswer: function(offer, callback) {
      if (!this.get('video') && !this.get('audio'))
        return this._onError("Call type has not been defined");

      var offerDescription = new mozRTCSessionDescription(offer);
      this.pc.setRemoteDescription(offerDescription, function() {
        this.pc.createAnswer(function(answer) {
          var cb = callback.bind(this, answer);
          this.pc.setLocalDescription(answer, cb, this._onError);
        }.bind(this), this._onError);
      }.bind(this), this._onError);
    },

    _getMedia: function(callback, errback) {
      var constraints = {video: this.get('video'), audio: this.get('audio')};

      var cb = function (localStream) {
        this.pc.addStream(localStream);
        this.set("localStream", localStream);
        callback();
      }.bind(this);

      navigator.mozGetUserMedia(constraints, cb, errback);
    },

    _onError: function(error) {
      // XXX Better error logging and handling
      console.log("WebRTCCall error: " + error);
    }
  });

  app.models.IncomingCall = Backbone.Model.extend({
    defaults: {callee: undefined,
               caller: undefined,
               offer: {}}
  });

  app.models.PendingCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
  });

  app.models.DeniedCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
  });

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.TextChatEntry = Backbone.Model.extend({
    defaults: {nick: undefined,
               message: undefined,
               date: new Date().getTime()}
  });

  app.models.TextChat = Backbone.Collection.extend({
    model: app.models.TextChatEntry,

    constructor: function() {
      Backbone.Collection.apply(this, arguments);
      // register the talkilla.text-message event
      app.port.on('talkilla.text-message', function(entry) {
        this.add(entry);
      }.bind(this));
    }
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined, presence: "disconnected"},

    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('nick') !== undefined;
    }
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User,

    initialize: function(models, options) {
      this.models = models || [];
      this.options = options;
      // register the talkilla.users event
      app.port.on('talkilla.users', function(users) {
        this.reset(users);
      }.bind(this));
    }
  });
})(app, Backbone, StateMachine);
