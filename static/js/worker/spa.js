/* global importScripts, BackboneEvents, HTTP, payloads */
/* jshint unused:false */

/**
 * SPA container.
 *
 * Wraps a SPA in a sub worker.
 */
var SPA = (function() {
  "use strict";

  function SPA(options) {
    if (!options || !options.src)
      throw new Error("missing parameter: src");

    this.worker = new Worker(options.src);
    this.worker.onmessage = this._onMessage.bind(this);
    this.http = new HTTP();

    // XXX Possibly expose a configuration object for storing SPA settings.
    this.capabilities = [];
  }

  SPA.prototype = {
    _onMessage: function(event) {
      var type;
      var topic = event.data.topic;
      var data = event.data.data;

      var topicPayloads = {
        "offer": payloads.Offer,
        "answer": payloads.Answer,
        "hangup": payloads.Hangup,
        "ice:candidate": payloads.IceCandidate,
        "move-accept": payloads.MoveAccept,
        "hold": payloads.Hold,
        "resume": payloads.Resume
      };

      if (topic === "message") {
        type = data.shift();
        data = data.shift();
        this.trigger("message", type, data);
        this.trigger("message:" + type, data);
      } else if (topic in topicPayloads) {
        var Payload = topicPayloads[topic];
        this.trigger(topic, new Payload(data));
      } else {
        this.trigger(topic, data);
      }
    },

    _send: function(topic, data) {
      this.worker.postMessage({topic: topic, data: data});
    },

    connect: function(credentials) {
      this._send("connect", credentials);
    },

    forgetCredentials: function() {
      this._send("forget-credentials");
    },

    /**
     * Initiate a call via an SDP offer.
     *
     * @param {payloads.Offer} offerMsg an Offer payload to initiate a
     * call.
     */
    callOffer: function(offerMsg) {
      this._send("offer", offerMsg);
    },

    /**
     * Accept a call via an SDP answer.
     *
     * @param {payloads.Answer} answerMsg an Answer payload to accept
     * a call.
     */
    callAnswer: function(answerMsg) {
      this._send("answer", answerMsg);
    },

    /**
     * End a call.
     *
     * @param {payloads.Hangup} hangupMsg a Hangup payload to end a
     * call.
     */
    callHangup: function(hangupMsg) {
      this._send("hangup", hangupMsg);
    },

    /**
     * Update the available ICE candidates for a call.
     *
     * @param {payloads.IceCandidate} iceCandidateMsg a IceCandidate
     * payload to update the available ICE candidates.
     */
    iceCandidate: function(iceCandidateMsg) {
      this._send("ice:candidate", iceCandidateMsg);
    },

    initiateMove: function(moveMsg) {
      this._send("initiate-move", moveMsg.toJSON());
    }
  };

  BackboneEvents.mixin(SPA.prototype);

  return SPA;
}());
