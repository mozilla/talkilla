/* global StateMachine, Backbone, _,
          mozRTCPeerConnection, mozRTCSessionDescription */

(function(exports) {
  "use strict";

  var defaultConstraints = {video: false, audio: false, fake: false};

  /**
   * WebRTC object constructor.
   * @param {PeerConnection} pc       Peer connection object
   * @param {Object}         options  Options
   */
  function WebRTC(pc, options) {
    this.constraints = {};
    this.options = options || {}; // TODO: fake media option

    this.pc = pc || new mozRTCPeerConnection();
    this.dc = this.pc.createDataChannel('dc', {});

    // peer connection event listeners
    this.pc.onaddstream = this._onAddStream.bind(this);
    this.pc.onclose = this._onPeerConnectionClose.bind(this);
    this.pc.ondatachannel = this._onDataChannel.bind(this);
    this.pc.oniceconnectionstatechange =
      this._onIceConnectionStateChange.bind(this);
    this.pc.onremovestream = this._onRemoveStream.bind(this);
    this.pc.onsignalingstatechange = this._onSignalingStateChange.bind(this);

    this.state = StateMachine.create({
      initial: 'ready',
      events: [
        {name: 'initiate',  from: 'ready',   to: 'pending'},
        {name: 'establish', from: 'pending', to: 'ongoing'},
        {name: 'answer',    from: 'ready',   to: 'ongoing'},
        {name: 'terminate', from: '*',       to: 'terminated'}
      ],
      callbacks: {
        onenterstate: function(event, from, to) {
          this.trigger("change:state", to, from, event);
          this.trigger("state:" + event);
          this.trigger("state:to:" + to);
        }.bind(this)
      }
    });
  }
  exports.WebRTC = WebRTC;

  _.extend(WebRTC.prototype, Backbone.Events);

  // public API

  /**
   * Initiates an outgoing connection.
   * @param  {Object}  constraints  Media constraints
   * @return {WebRTC}
   * @event  `local-stream:ready` {LocalMediaStream}
   * @public
   */
  WebRTC.prototype.initiate = function(constraints) {
    this.state.initiate();
    this.constraints = constraints || defaultConstraints;
    return this._getMedia(function(localStream) {
      this.trigger('local-stream:ready', localStream)
          ._addLocalStream(localStream)
          ._createOffer();
    });
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
    this.pc.setRemoteDescription(
      new mozRTCSessionDescription(answer),
      this.trigger.bind(this, 'connection-established'),
      this._handleError.bind(this, 'Unable to set remote answer description')
    );
    return this;
  };

  /**
   * Answers an incoming onnection offer.
   * @param  {Object}  offer  Connection offer
   * @return {WebRTC}
   * @public
   */
  WebRTC.prototype.answer = function(offer) {
    this.state.answer();
    this.constraints = this._parseOfferConstraints(offer);
    return this._getMedia(function(localStream) {
      this.trigger('local-stream:ready', localStream);
      this._addLocalStream(localStream);
      this.pc.setRemoteDescription(
        new mozRTCSessionDescription(offer),
        this._createAnswer.bind(this),
        this._handleError.bind(this, 'Unable to set remote offer description')
      );
    });
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
    if (this.pc.signalingState !== 'closed')
      this.pc.close();
    return this.trigger('connection-terminated');
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
  WebRTC.prototype._onDataChannel = function(event) {
    var eventsMap = {
      onopen: 'dc:open',
      onmessage: 'dc:message-in',
      onerror: 'dc:error',
      onclose: 'dc:close'
    };
    for (var handler in eventsMap)
      event.channel[handler] = this.trigger.bind(this, eventsMap[handler]);
    this.trigger('dc:ready', event.channel);
  };

  /**
   * Executed when the ICE connection state changes.
   * @return {Event} event
   */
  WebRTC.prototype._onIceConnectionStateChange = function() {
    this.trigger('ice:change', this.pc.readyState);
    this.trigger('ice:' + this.pc.readyState);
  };

  /**
   * Executed when the current peer connection is closed.
   */
  WebRTC.prototype._onPeerConnectionClose = function() {
    this.terminate();
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
    this.trigger('signaling:change', event);
    this.trigger('signaling:' + event);
  };

  /**
   * Extracts media constraints from an offer SDP.
   * @param  {Object}  offer  Offer object
   * @return {Object}         Media constraints object
   * @private
   */
  WebRTC.prototype._parseOfferConstraints = function(offer) {
    var sdp = offer && offer.sdp;
    if (!sdp)
      return this._handleError('No SDP offer to parse');
    return {
      video: sdp.contains('\nm=video '),
      audio: sdp.contains('\nm=audio ')
    };
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
})(this);
