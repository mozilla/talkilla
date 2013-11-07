/*global StateMachine, tnetbin, mozRTCIceCandidate */

(function(exports) {
  "use strict";

  var defaultConstraints = {video: false, audio: false, fake: false};

  /**
   * WebRTC object constructor.
   *
   * Options are:
   * - {Boolean} forceFake:  Forces fake media streams (default: false)
   *
   * @param {Object}                   options  Options
   */
  function WebRTC(options) {
    // pc is for "peer connection"
    this.pc = undefined;
    // dc is for "data channel"
    this.dc = undefined;
    this._constraints = {};
    this.options = options || {};

    this.state = StateMachine.create({
      initial: 'ready',
      events: [
        {name: 'initiate',  from: 'ready',     to: 'pending'},
        {name: 'establish', from: 'pending',   to: 'ongoing'},
        {name: 'upgrade',   from: 'ongoing',   to: 'pending'},
        {name: 'answer',    from: ['ready',
                                   'ongoing'], to: 'ongoing'},
        {name: 'terminate', from: '*',         to: 'terminated'},
        {name: 'reset',     from: '*',         to: 'ready'}
      ],
      callbacks: {
        onenterstate: function(event, from, to) {
          this.trigger("change:state", to, from, event);
          this.trigger("transition:" + event);
          this.trigger("state:to:" + to);
        }.bind(this)
      }
    });
  }
  exports.WebRTC = WebRTC;

  _.extend(WebRTC.prototype, Backbone.Events);

  // public properties

  /* jshint camelcase:false */
  WebRTC.prototype.__defineGetter__('constraints', function() {
    var _constraints = this._constraints || defaultConstraints;

    if (!!this.options.forceFake)
      _constraints.fake = true;

    return _constraints;
  });

  WebRTC.prototype.__defineSetter__('constraints', function(constraints) {
    this._constraints = constraints || defaultConstraints;

    if (!!this.options.forceFake)
      this._constraints.fake = true;
  });
  /* jshint camelcase:true */

  // static methods

  /**
   * Extracts media constraints from an offer SDP.
   * @param  {Object}  offer  Offer object
   * @return {Object}         Media constraints object
   * @private
   */
  WebRTC.parseOfferConstraints = function(offer) {
    var sdp = offer && offer.sdp;

    if (!sdp)
      throw new Error('No SDP offer to parse');

    return {
      video: sdp.contains('\nm=video '),
      audio: sdp.contains('\nm=audio ')
    };
  };

  // public prototype

  /**
   * Initiates an outgoing connection.
   * @param  {Object}  constraints  Media constraints
   * @return {WebRTC}
   * @event  `local-stream:ready` {LocalMediaStream}
   * @public
   */
  WebRTC.prototype.initiate = function(constraints) {
    this.state.initiate();
    this._setupPeerConnection();
    this.constraints = constraints;

    if (!this.constraints.video && !this.constraints.audio)
      return this._createOffer();

    return this._getMedia(function(localStream) {
      this.trigger('local-stream:ready', localStream)
          ._addLocalStream(localStream)
          ._createOffer();
    });
  };

  /**
   * Upgrades an established peer connection with new constraints.
   * @param  {Object} constraints User media constraints
   * @return {WebRTC}
   */
  WebRTC.prototype.upgrade = function(constraints) {
    this.state.upgrade();

    if (!constraints || typeof constraints !== 'object')
      throw new Error('upgrading needs new media constraints');
    this.constraints = constraints;

    // XXX: renegotiate connection once supported by the WebRTC API;
    //      right now, reinitialize the current peer connection.
    this.once('connection-terminated', function() {
      this.state.current = "ready";
      this.once('ice:connected', function() {
        this.trigger('connection-upgraded');
      }).initiate(constraints);
    }).terminate();

    // force state to pending as we're actually waiting for pc reinitiation
    this.state.current = "pending";

    return this;
  };

  /**
   * Establishes the connection using the received answer.
   * @param  {Object} answer
   * @return {WebRTC}
   * @event  `connection-established`
   * @public
   */
  WebRTC.prototype.establish = function(answer) {
    this.state.establish();
    this._prepareEstablishment();

    this.pc.setRemoteDescription(
      new mozRTCSessionDescription(answer),
      function() {},
      this._handleError.bind(this, 'Unable to set remote answer description')
    );

    return this;
  };

  /**
   * Answers an incoming initial or upgraded connection offer.
   * @param  {Object}  offer  Connection offer
   * @return {WebRTC}
   * @public
   */
  WebRTC.prototype.answer = function(offer) {
    this.state.answer();
    this._setupPeerConnection();
    this.constraints = WebRTC.parseOfferConstraints(offer);

    if (!this.constraints.video && !this.constraints.audio)
      return this._prepareAnswer(offer);

    return this._getMedia(function(localStream) {
      this.trigger('local-stream:ready', localStream)
          ._addLocalStream(localStream)
          ._prepareAnswer(offer);
    });
  };

  /**
   * Adds an ice candidate to the peer connection.
   * @param {Object} candidate Object containing the data for a
   *                           mozRTCIceCandidate.
   */
  WebRTC.prototype.addIceCandidate = function(candidate) {
    if (candidate)
      this.pc.addIceCandidate(new mozRTCIceCandidate(candidate));
  };

  /**
   * Resets the peer connection.
   * @return {WebRTC}
   */
  WebRTC.prototype.reset = function() {
    this.state.reset();
    this._setupPeerConnection();

    return this;
  };

  /**
   * Sends data over data channel.
   * @param  {Object} data
   * @return {WebRTC}
   * @event  `dc:message-out` {Object}
   * @public
   */
  WebRTC.prototype.send = function(data) {
    if (this.state.current !== 'ongoing')
      return this._handleError("Not connected, can't send data");

    data = tnetbin.encode(data);
    try {
      this.dc.send(data);
    } catch(err) {
      return this._handleError("Couldn't send data", err);
    }

    return this.trigger('dc:message-out', data);
  };

  /**
   * Terminates an ongoing communication.
   * @return {WebRTC}
   * @event  `connection-terminated`
   * @public
   */
  WebRTC.prototype.terminate = function() {
    this.state.terminate();

    if (!this.pc || this.pc.signalingState === 'closed')
      return this;

    // Tell everyone that we're terminating the streams
    this.trigger('local-stream:terminated');
    this.trigger('remote-stream:terminated');

    // Actually stop the local stream, so that we don't keep hold of the media
    // elements.
    var streams = this.pc.getLocalStreams();
    streams.forEach(function(stream) {
      stream.stop();
    });

    this.once('ice:closed', this.trigger.bind(this, 'connection-terminated'));
    this.pc.close();

    return this;
  };

  /**
   * Mutes all the video or audio streams on the connection
   * @param {String}  type  The type of stream to mute, values are
   *                        'local' or 'remote'
   * @param {String}  media The type of media stream to mute, values are
   *                        'audio' or 'video'
   * @param {Boolean} mute  True to mute the stream, false to unmute
   */
  WebRTC.prototype.setMuteState = function(type, media, mute) {
    var streams;

    if (type === 'local')
      streams = this.pc.getLocalStreams();
    else if (type === 'remote')
      streams = this.pc.getRemoteStreams();
    else
      throw new Error("Unsupported stream type: " + type);

    function muteTrack(track) {
      track.enabled = !mute;
    }

    streams.forEach(function(stream) {
      if (media === 'audio')
        stream.getAudioTracks().forEach(muteTrack, this);
      else if (media === 'video')
        stream.getVideoTracks().forEach(muteTrack, this);
    }, this);
  };

  // "private" methods

  /**
   * Adds a local media stream to the peer connection.
   * @param  {LocalMediaStream} localStream
   * @return {WebRTC}
   */
  WebRTC.prototype._addLocalStream = function(localStream) {
    try {
      this.pc.addStream(localStream);
    } catch (err) {
      return this._handleError('Unable to add local stream', err);
    }

    return this;
  };

  /**
   * Creates an answer.
   * @return {WebRTC}
   * @private
   */
  WebRTC.prototype._createAnswer = function() {
    this.pc.createAnswer(
      this._setAnswerDescription.bind(this),
      this._handleError.bind(this, 'Unable to create answer')
    );

    return this;
  };

  /**
   * Creates an offer.
   * @return {WebRTC}
   * @private
   */
  WebRTC.prototype._createOffer = function() {
    this.pc.createOffer(
      this._setOfferDescription.bind(this),
      this._handleError.bind(this, 'Unable to create offer')
    );

    return this;
  };

  /**
   * gUM proxy.
   * @param  {Function} callback    Callback
   * @return {WebRTC}
   * @private
   */
  WebRTC.prototype._getMedia = function(callback) {
    navigator.mozGetUserMedia(
      this.constraints,
      callback.bind(this),
      this._handleError.bind(this, 'Unable to get user media, constraints=' +
                                   this.constraints.toSource())
    );

    return this;
  };

  /**
   * Handles a WebRTC error.
   * @param  {String} message
   * @param  {Object} err
   * @return {WebRTC}
   * @private
   */
  WebRTC.prototype._handleError = function(description, err) {
    var messageParts = [description];

    if (err && typeof err === "object")
      messageParts = messageParts.concat([':', err.name, err.message]);

    return this.trigger('error', messageParts.join(' '));
  };

  /**
   * Executed when a remote media stream is added to current peer connection.
   * @param  {Event} event
   */
  WebRTC.prototype._onAddStream = function(event) {
    this.trigger('remote-stream:ready', event.stream);
  };

  /**
   * Executed on incoming data channel.
   * @param  {RTCDataChannelEvent} event
   */
  WebRTC.prototype._onDataChannel = function() {
    console.error("Unexpected call to _onDataChannel - negotiated channel?");
  };

  /**
   * Executed when the ICE connection state changes.
   *
   * Emits the `ice:change` event with the new state name as a parameter, and
   * one of these depending on the new connection state:
   * - ice:new
   * - ice:checking
   * - ice:connected
   * - ice:completed
   * - ice:failed
   * - ice:disconnected
   * - ice:closed
   *
   * @link http://www.w3.org/TR/webrtc/#h4_rtciceconnectionstate-enum
   */
  WebRTC.prototype._onIceConnectionStateChange = function() {
    this.trigger('ice:' + this.pc.iceConnectionState);
    this.trigger('ice:change', this.pc.iceConnectionState);
  };

  /**
   * Executed when an ICE candidate is received.
   * @param  {mozRTCIceCandidate} event.candidate
   * @event  `ice:candidate-ready` {Object}
   */
  WebRTC.prototype._onIceCandidate = function(event) {
    // The last candidate event is a null event, we let this be transmitted
    // to the SPA, and possibly the other side as this allows the SPA to
    // reconstruct ICE candidates into the SDP in the case of the SP not
    // supporting trickle ICE.
    if (event) {
      this.trigger('ice:candidate-ready',
        // XXX Manually convert event.candidate until bug 928304 is
        // incorporated in all versions we support, i.e. Firefox 27.0a2
        // onwards. This is due to mozRTCIceCandidate not having supported
        // serialization previously.
        event.candidate ? {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex
        } : null
      );
    }
  };

  /**
   * Executed when a remote media stream is removed from the current peer
   * connection.
   * @param  {Event} event
   */
  WebRTC.prototype._onRemoveStream = function(event) {
    this.trigger('remote-stream:remove', event.stream);
  };

  /**
   * Executed when the current signaling state changes.
   * @param  {Event} event
   */
  WebRTC.prototype._onSignalingStateChange = function(event) {
    this.trigger('signaling:' + event);
    this.trigger('signaling:change', event);
  };

  /**
   * Prepares connection establishment.
   */
  WebRTC.prototype._prepareEstablishment = function() {
    this.on('ice:connected', this.trigger.bind(this, 'connection-established'));
  };

  /**
   * Prepares an answer based on passed offer.
   * @param  {Object} offer
   * @return {WebRTC}
   */
  WebRTC.prototype._prepareAnswer = function(offer) {
    this.pc.setRemoteDescription(
      new mozRTCSessionDescription(offer),
      this._createAnswer.bind(this),
      this._handleError.bind(this, 'Unable to set remote offer description')
    );

    return this;
  };

  /**
   * Sets local session description from a connection answer object.
   * @param  {Object} answer
   * @return {WebRTC}
   * @event  `answer-ready` {Object}
   * @private
   */
  WebRTC.prototype._setAnswerDescription = function(answer) {
    this.pc.setLocalDescription(
      answer,
      this.trigger.bind(this, 'answer-ready', answer),
      this._handleError.bind(this, 'Unable to set local answer description')
    );

    return this;
  };

  /**
   * Sets local session description from a connection offer object.
   * @param  {Object} offer
   * @return {WebRTC}
   * @event  `offer-ready` {Object}
   * @private
   */
  WebRTC.prototype._setOfferDescription = function(offer) {
    this.pc.setLocalDescription(
      offer,
      this.trigger.bind(this, 'offer-ready', offer),
      this._handleError.bind(this, 'Unable to set local offer description')
    );

    return this;
  };

  /**
   * Configures a peer connection, registering local event listeners.
   *
   * @param {RTCPeerConnection} pc
   */
  WebRTC.prototype._setupPeerConnection = function() {
    this.pc = new mozRTCPeerConnection();
    this.dc = this._setupDataChannel(this.pc, 0);

    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.ondatachannel = this._onDataChannel.bind(this);
    this.pc.onicecandidate = this._onIceCandidate.bind(this);
    this.pc.oniceconnectionstatechange =
      this._onIceConnectionStateChange.bind(this);
    this.pc.onremovestream = this._onRemoveStream.bind(this);
    this.pc.onsignalingstatechange = this._onSignalingStateChange.bind(this);
  };

  /**
   * Configures a data channel, registering local event listeners.
   *
   * @param {RTCPeerConnection} pc
   * @param {short}             id of the data channel to create
   */
  WebRTC.prototype._setupDataChannel = function(pc, id) {
    var dc = pc.createDataChannel('dc', {
      // We set up a pre-negotiated channel with a specific id, this
      // way we know exactly which channel we're expecting to communicate
      // with.
      id: id,
      negotiated: true
    });

    dc.onopen  = this.trigger.bind(this, "dc:ready", dc);
    dc.onerror = this.trigger.bind(this, "dc:error");
    dc.onclose = this.trigger.bind(this, "dc:close");
    dc.onmessage = function(event) {
      var data = tnetbin.decode(event.data).value;
      this.trigger("dc:message-in", data);
    }.bind(this);

    return dc;
  };
})(this);
