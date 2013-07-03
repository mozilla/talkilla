/* global app, Backbone, StateMachine,
   mozRTCPeerConnection, mozRTCSessionDescription */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine) {
  "use strict";

  function log() {
    if (!app.options.DEBUG)
      return;
    return console.log.apply(console, arguments);
  }

  function error() {
    if (!app.options.DEBUG)
      return;
    return console.error.apply(console, arguments);
  }

  /**
   * Call model.
   *
   * Attributes:
   * - {Object} incomingData
   *
   * Fired when #start() is called and the pending call timeout is reached with
   * no response from the other side.
   * @event offer-timeout
   * @param {Object} options Current call start options (see #start)
   */
  app.models.Call = Backbone.Model.extend({
    timer: undefined,
    media: undefined,

    /**
     * Call model constructor.
     * @param  {Object}  attributes  Model attributes
     * @param  {Object}  options     Model options
     *
     * Options:
     * - {app.models.WebRTCCall}  media      Media object
     */
    initialize: function(attributes, options) {
      this.set(attributes || {});

      this.media = options && options.media;
      this.peer = options && options.peer;

      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',    to: 'pending'},
          {name: 'establish', from: 'pending',  to: 'ongoing'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',    to: 'incoming'},
          {name: 'accept',    from: 'incoming', to: 'pending'},
          {name: 'ignore',    from: 'incoming', to: 'terminated'},
          {name: 'complete',  from: 'pending',  to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',        to: 'terminated'}
        ],
        callbacks: {
          onenterstate: function(event, from, to) {
            this.trigger("change:state", to, from, event);
            this.trigger("state:" + event);
            this.trigger("state:to:" + to);
          }.bind(this)
        }
      });

      this.media.on("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer
        });
      }.bind(this));

      this.media.on("answer-ready", function(answer) {
        this.trigger("send-answer", {
          peer: this.peer.get("nick"),
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
     * Starts an outbound call.
     *
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    start: function(options) {
      this._startTimer({
        callData: options,
        timeout: app.options.PENDING_CALL_TIMEOUT
      });
      this.state.start();
      this.media.offer(options);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     * - offer: information for the media object
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    incoming: function(options) {
      this.set({
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
      clearTimeout(this.timer);
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
     * Ignores an incoming call.
     */
    ignore: function() {
      this.state.ignore();
    },

    /**
     * Hangs up a call
     */
    hangup: function() {
      clearTimeout(this.timer);
      this.state.hangup();
      this.media.hangup();
    },

    /**
     * Starts the outgoing pending call timer.
     * @param {Object} options:
     *      - {Number} timeout   Timeout in ms
     *      - {Object} callData  Current outgoing pending call data
     */
    _startTimer: function(options) {
      if (!options || !options.timeout)
        return;

      var onTimeout = function() {
        this.trigger('offer-timeout', options.callData);
      }.bind(this);

      this.timer = setTimeout(onTimeout, options.timeout);
    }
  });

  /**
   * WebRTC call model
   *
   * @class WebRTCCall
   * @constructor
   *
   * Attributes:
   *
   * - {Boolean} audio: enable audio stream
   * - {Boolean} video: enable video stream
   * - {Boolean} fake: use fake streams
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
    connected: false,
    pc: undefined,    // peer connection
    dcIn: undefined,  // data channel in
    dcOut: undefined, // data channel out

    initialize: function(attributes, options) {
      this.pc = new mozRTCPeerConnection();

      // outgoing data channel
      if (options && !!options.dataChannel) {
        log("creating outgoing data channel");

        this.dcOut = this.pc.createDataChannel('dc', {});

        // incoming data channel
        this.pc.ondatachannel = function(event) {
          log("creating incoming data channel");
          this.dcIn = this._setupDataChannelIn(event.channel);
          this.trigger('dc.in.ready', event);
        }.bind(this);
      }

      // remote stream
      this.pc.onaddstream = function(event) {
        this.set("remoteStream", event.stream);
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
      log("WebRTCCall#offer", options);
      this.set({
        video: !!(options && options.video),
        audio: !!(options && options.audio)
      });
      var callback = this.trigger.bind(this, "offer-ready");
      this._getMedia(this._createOffer.bind(this, callback), function(err) {
        error("Unable to get media (offer)", err);
      });
    },

    /**
     * Establish a WebRTC p2p connection.
     * @param {Object} options object containing:
     *
     * - answer: the answer (sdp) to add to the peer connection
     */
    establish: function(options) {
      log("WebRTCCall#establish", options);
      var answerDescription = new mozRTCSessionDescription(options.answer);
      log("answer description", answerDescription);

      var onEstablished = function() {
        this.connected = true;
        this.trigger("established");
      }.bind(this);

      this.pc.setRemoteDescription(answerDescription, onEstablished,
        function(err) {
          error("Unable to set remote description", err);
        });
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
      log("WebRTCCall#answer", options);

      this.set({
        video: !!(options && options.video),
        audio: !!(options && options.audio)
      });

      var callback = this.trigger.bind(this, "answer-ready");
      var createAnswer = this._createAnswer.bind(this, options.offer, callback);
      this._getMedia(createAnswer, function(err) {
        error("Unable to get media (answer)", err);
      });
    },

    /**
     * Sends data over data channel, initiating and establishing the peer
     * communication if necessary.
     *
     * @param  {Object} data
     */
    send: function(data) {
      this._ensureConnected(function() {
        if (!this.dcOut)
          return error('No data channel connection available');
        this.dcOut.send(JSON.stringify(data));
      }, "dc.in.open");
    },

    /**
     * Close the p2p connection.
     */
    hangup: function() {
      log("WebRTCCall#hangup");
      this.connected = false;
      if (this.pc && this.pc.signalingState !== "closed")
        this.pc.close();
    },

    _getConstraints: function() {
      return {
        video: !!this.get('video'),
        audio: !!this.get('audio'),
        fake:  !!this.get('fake')
      };
    },

    _createOffer: function(callback) {
      log("WebRTCCall#_createOffer");

      var onOfferCreated = function(offer) {
        var cb = callback.bind(this, offer);
        this.pc.setLocalDescription(offer, cb, function(err) {
          error("Unable to set local description (offer)", err);
        });
      }.bind(this);

      this.pc.createOffer(onOfferCreated, function(err) {
        error("Unable to create offer", err);
      });
    },

    _createAnswer: function(offer, callback) {
      log("WebRTCCall#_createAnswer", offer);

      var offerDescription = new mozRTCSessionDescription(offer);

      var onAnswerCreated = function(answer) {
        log("answer created", answer);

        var onEstablished = function() {
          var cb = callback.bind(this, answer);
          this.connected = true;
          this.trigger("established");
          cb();
        }.bind(this);

        this.pc.setLocalDescription(answer, onEstablished,
          function(err) {
            error("Unable to set local description (answer)", err);
          });
      }.bind(this);

      var cb = function() {
        this.pc.createAnswer(onAnswerCreated, function(err) {
          error("Unable to create answer", err);
        });
      }.bind(this);

      this.pc.setRemoteDescription(offerDescription, cb, function(err) {
        error("Unable to set remote description", err);
      });
    },

    /**
     * Checks for an established peer connection before processing the provided
     * callback. Will queue tasks until then.
     * @param  {Function} callback   Callback to call once connected
     * @param  {String}   eventName  Connect event to wait for
     */
    _ensureConnected: function(callback, eventName) {
      if (this.connected)
        return callback.call(this);

      this.offer(this._getConstraints());
      this.once(eventName || "established", callback, this);
    },

    _getMedia: function(callback, errback) {
      log("WebRTCCall#_getMedia");
      // if no media required, skip gUM
      if (!this.get('video') && !this.get('audio'))
        return callback();

      var cb = function (localStream) {
        this.pc.addStream(localStream);
        this.set("localStream", localStream);
        callback();
      }.bind(this);

      navigator.mozGetUserMedia(this._getConstraints(), cb, errback);
    },

    _setupDataChannelIn: function(channel) {
      log("WebRTCCall#_setupDataChannelIn");
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

    _onError: function(err) {
      // XXX: better error logging
      var readable = err;
      if ("name" in err && "message" in err)
        readable = err.name + ": " + err.message;
      else
        readable = err.toString();
      var message = "WebRTCCall error: " + readable;
      error(message);
      throw new Error(message);
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

    media: undefined,
    peer: undefined,

    initialize: function(attributes, options) {
      if (!options || !options.media)
        throw new Error('TextChat model needs a `media` option');
      if (!options || !options.peer)
        throw new Error('TextChat model needs a `peer` option');

      this.media = options && options.media;
      this.peer = options && options.peer;

      this.media.on("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer,
          dataChannel: true
        });
      }, this);

      this.media.on("answer-ready", function(answer) {
        this.trigger("send-answer", {
          peer: this.peer.get("nick"),
          answer: answer,
          dataChannel: true
        });
      }, this);

      this.media.on('dc.in.message', function(event) {
        this.add(JSON.parse(event.data));
      }, this);
    },

    incoming: function(options) {
      this.media.answer(options);
    },

    /**
     * Establish communication through data channel.
     * @param  {Object} options
     */
    establish: function(options) {
      this.media.establish(options);
    },

    /**
     * Adds a new entry to the collection and sends it over data channel.
     * TODO: send entry over data channel
     * @param  {Object} data
     */
    send: function(data) {
      var entry = this.add(data).at(this.length - 1);
      if (entry)
        this.media.send(entry.toJSON());
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
