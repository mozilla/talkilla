/* global app, Backbone, StateMachine,
   mozRTCPeerConnection, mozRTCSessionDescription */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine) {
  "use strict";

  app.models.Call = Backbone.Model.extend({
    media: undefined,

    initialize: function(attributes, media) {
      this.set(attributes || {});

      this.media = media;

      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',    to: 'pending'},
          {name: 'establish', from: 'pending',  to: 'ongoing'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',    to: 'incoming'},
          {name: 'accept',    from: 'incoming', to: 'pending'},
          {name: 'complete',  from: 'pending',  to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',        to: 'terminated'}
        ],
        callbacks: {
          onenterstate: function(event, from, to) {
            this.trigger("change:state", to, from, event);
          }.bind(this)
        }
      });

      this.media.on("offer-ready", function(offer) {
        this.trigger("send-offer", {
          caller: this.get("id"),
          callee: this.get("otherUser"),
          offer: offer
        });
      }.bind(this));

      this.media.on("answer-ready", function(answer) {
        this.trigger("send-answer", {
          caller: this.get("otherUser"),
          callee: this.get("id"),
          answer: answer
        });

        // XXX Change transition to complete/ongoing here as
        // this is the best place we've got currently to know that
        // the incoming call is now ongoing. When WebRTC platform
        // support comes for connection notifications, we'll want
        // to handle this differently.
        this.state.complete();
      }.bind(this));
    },

    /**
     * Starts an outbound call call
     * @param {Object} options object containing:
     *
     * - caller: The id of the user logged in
     * - callee: The id of the user to be called
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    start: function(options) {
      this.set({id: options.caller, otherUser: options.callee});
      this.state.start();
      this.media.offer(options);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {Object} options object containing:
     *
     * - caller: The id of the other user
     * - callee: The id of the user logged in
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    incoming: function(options) {
      this.set({
        otherUser: options.caller,
        id: options.callee,
        incomingData: options
      });
      this.state.incoming();
    },

    /**
     * Completes the connection for an outbound call
     * @param {Object} options object containing:
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    establish: function(options) {
      this.state.establish();
      this.media.establish(options);
    },

    /**
     * Accepts a pending incoming call.
     */
    accept: function() {
      this.media.answer(this.get('incomingData'));
      this.state.accept();
    },

    /**
     * Hangs up a call
     */
    hangup: function() {
      this.state.hangup();
      this.media.hangup();
    }
  });

  /**
   * WebRTC call model
   *
   * @class WebRTCCall
   * @constructor
   *
   * Fired when a SDP offer is available (see #offer).
   * @event offer-ready
   * @param {Object} offer An SDP offer
   *
   * Fired when a SDP answer is available (see #answer).
   * @event answer-ready
   * @param {Object} answer An SDP answer
   *
   *
   * Example:
   *
   * var webrtc = new app.models.WebRTCCall();
   *
   * // Caller side
   * webrtc.on('offer-ready', function(offer) {
   *   sendOffer(offer);
   * });
   * webrtc.offer()
   *
   * // Callee side
   * webrtc.on('answer-ready', function(answer) {
   *   sendAnswer(answer);
   * }
   * webrtc.answer(offer);
   *
   * // Once the caller receive the answer
   * webrtc.establish(answer)
   *
   * // Both sides
   * webrtc.on("change:localStream", function() {
   *   localVideo.mozSrcObject = webrtc.get("localStream");
   *   localVideo.play();
   * });
   * webrtc.on("change:remoteStream", function() {
   *   remoteVideo.mozSrcObject = webrtc.get("remoteStream");
   *   remoteVideo.play();
   * });
   */
  app.models.WebRTCCall = Backbone.Model.extend({
    pc: undefined, // peer connection
    dcIn: undefined, // data channel in
    dcOut: undefined, // data channel out

    initialize: function() {
      this.pc = new mozRTCPeerConnection();
      this.dcOut = this.pc.createDataChannel('dc', {});

      this.pc.onaddstream = function(event) {
        this.set("remoteStream", event.stream);
      }.bind(this);

      // data channel for incoming calls
      this.pc.ondatachannel = function(event) {
        this.dcIn = this._setupDataChannelIn(event.channel);
        this.trigger('dc.in.ready', event);
      }.bind(this);

      this._onError = this._onError.bind(this);
    },

    /**
     * Create a SDP offer after calling getUserMedia. In case of
     * success, it triggers an offer-ready event with the created offer.
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    offer: function(options) {
      this.set({video: options.video, audio: options.audio});
      var callback = this.trigger.bind(this, "offer-ready");
      this._getMedia(this._createOffer.bind(this, callback), this._onError);
    },

    /**
     * Establish a WebRTC p2p connection.
     * @param {Object} options object containing:
     *
     * - answer: the answer (sdp) to add to the peer connection
     */
    establish: function(options) {
      var answerDescription = new mozRTCSessionDescription(options.answer);
      var cb = function() {};
      this.pc.setRemoteDescription(answerDescription, cb, this._onError);
    },

    /**
     * Create a SDP answer after calling getUserMedia. In case of
     * success, it triggers an answer-ready event with the created answer.
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     * - offer: the offer (sdp) to respond to.
     */
    answer: function(options) {
      this.set({video: options.video, audio: options.audio});
      var callback = this.trigger.bind(this, "answer-ready");
      var createAnswer = this._createAnswer.bind(this, options.offer, callback);
      this._getMedia(createAnswer, this._onError);
    },

    send: function(data) {
      if (!this.dcOut)
        return this._onError('no data channel connection available');
      this.dcOut.send(data);
    },

    /**
     * Close the p2p connection.
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
      var constraints = {
        video: this.get('video'),
        audio: this.get('audio')
      };

      var cb = function (localStream) {
        this.pc.addStream(localStream);
        this.set("localStream", localStream);
        callback();
      }.bind(this);

      navigator.mozGetUserMedia(constraints, cb, errback);
    },

    _setupDataChannelIn: function(channel) {
      channel.binaryType = 'blob';

      channel.onopen = function(event) {
        this.trigger('dc.in.open', event);
      }.bind(this);

      channel.onmessage = function(event) {
        this.trigger('dc.in.message', event);
      }.bind(this);

      channel.onerror = function(event) {
        this.trigger('dc.in.error', event);
      }.bind(this);

      channel.onclose = function(event) {
        this.trigger('dc.in.close', event);
      }.bind(this);

      return channel;
    },

    _onError: function(error) {
      // XXX Better error logging and handling
      console.error("WebRTCCall error: " + error);
    }
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

    newEntry: function(data) {
      var entry = this.add(data).at(this.length - 1);
      this.trigger('entry.created', entry);
    }
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined,
               avatar: "img/default-avatar.png",
               presence: "disconnected"},

    initialize: function() {
      // If the user has signed in or out, trigger the appropraite
      // change
      this.on("change", function() {
        if (this.isLoggedIn() && !this.wasLoggedIn())
          this.trigger('signin');
        else if (!this.isLoggedIn() && this.wasLoggedIn())
          this.trigger('signout');
      }.bind(this));
    },

    /**
     * Returns true if the user is logged in.
     */
    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('nick') !== undefined;
    },

    /**
     * Returns true if the user was logged in prior to the last change
     * on the model. Returns false if there have been no changes.
     */
    wasLoggedIn: function() {
      return this.previous('presence') !== "disconnected" &&
        this.previous('nick') !== undefined;
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
