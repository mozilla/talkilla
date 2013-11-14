/* global importScripts, BackboneEvents, HTTP, payloads */
/* jshint unused:false */

var SPA = (function() {
  function SPA(options) {
    if (!options || !options.src)
      throw new Error("missing parameter: src");

    this.worker = new Worker(options.src);
    this.worker.onmessage = this._onMessage.bind(this);
    this.http = new HTTP();
  }

  SPA.prototype = {
    _onMessage: function(event) {
      var type;
      var topic = event.data.topic;
      var data = event.data.data;

      var mapping = {
        "offer": payloads.Offer,
        "answer": payloads.Answer,
        "hangup": payloads.Hangup,
        "ice:candidate": payloads.IceCandidate
      };

      if (topic === "message") {
        type = data.shift();
        data = data.shift();
        this.trigger("message", type, data);
        this.trigger("message:" + type, data);
      } else if (topic in mapping) {
        var Constructor = mapping[topic];
        this.trigger(topic, new Constructor(data));
      } else {
        this.trigger(topic, data);
      }
    },

    _send: function(topic, data) {
      // TODO: check the type of data and if it's a payload (like
      // payloads.Offer) call toJSON on it. The SPA interface should
      // not send custom objects.
      this.worker.postMessage({topic: topic, data: data});
    },

    signin: function(assertion, callback) {
      this.http.post("/signin", {assertion: assertion}, callback);
    },

    signout: function(callback) {
      this.http.post("/signout", {}, callback);
    },

    connect: function(credentials) {
      this._send("connect", credentials);
    },

    /**
     * Initiate a call via an SDP offer.
     *
     * @param {payloads.Offer} offerMsg an Offer payload to initiate a
     * call.
     */
    callOffer: function(offerMsg) {
      this._send("offer", offerMsg.toJSON());
    },

    /**
     * Accept a call via an SDP answer.
     *
     * @param {payloads.Answer} answerMsg an Answer payload to accept
     * a call.
     */
    callAnswer: function(answerMsg) {
      this._send("answer", answerMsg.toJSON());
    },

    /**
     * End a call.
     *
     * @param {payloads.Hangup} hangupMsg a Hangup payload to end a
     * call.
     */
    callHangup: function(hangupMsg) {
      this._send("hangup", hangupMsg.toJSON());
    },

    /**
     * Update the available ICE candidates for a call.
     *
     * @param {payloads.IceCandidate} iceCandidateMsg a IceCandidate
     * payload to update the available ICE candidates.
     */
    iceCandidate: function(iceCandidateMsg) {
      this._send("ice:candidate", iceCandidateMsg.toJSON());
    },

    presenceRequest: function() {
      this._send("presence:request");
    }
  };

  BackboneEvents.mixin(SPA.prototype);

  return SPA;
}());
