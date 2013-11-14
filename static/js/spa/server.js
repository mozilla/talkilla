/* global importScripts, BackboneEvents, HTTP */
/* jshint unused:false */

var Server = (function() {
  function Server(options) {
    this.options = options;
    this.http = new HTTP();
  }

  Server.prototype = {
    connect: function() {
      this.http.post("/stream", {firstRequest: true}, function(err, response) {
        if (err === 400)
          return this.trigger("unauthorized", response);
        if (err !== null)
          return this.trigger("disconnected", response);

        this.trigger("connected");
        this._longPolling(JSON.parse(response));
      }.bind(this));
    },

    _longPolling: function(events) {
      events.forEach(function(event) {
        this.trigger("message", event.topic, event.data);
        this.trigger("message:" + event.topic, event.data);
      }.bind(this));

      this.http.post("/stream", {}, function(err, response) {
        if (err === 400)
          return this.trigger("unauthorized", response);
        if (err !== null)
          return this.trigger("disconnected", response);

        this._longPolling(JSON.parse(response));
      }.bind(this));
    },

    /**
     * Initiate a call via the /calloffer API
     *
     * @param {payloads.Offer} offerMsg An Offer payload to initiate the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callOffer: function(offerMsg, callback) {
      this.http.post("/calloffer", {data: offerMsg}, callback);
    },

    /**
     * Accept a call via the /callanswer API
     *
     * @param {payloads.Answer} answerMsg An Answer payload to accept the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callAccepted: function(answerMsg, callback) {
      this.http.post("/callaccepted", {data: answerMsg}, callback);
    },

    /**
     * End a call via the /callhangup API
     *
     * @param {payloads.Hangup} hangupMsg A Hangup payload to end the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callHangup: function(hangupMsg, callback) {
      this.http.post("/callhangup", {data: hangupMsg}, callback);
    },

    /**
     * Send a new ICE candidate via /icecandidate
     *
     * @param {payloads.IceCandidate} iceCandidateMsg An IceCandidate
     * payload to send to a peer.
     * @param {function} callback A callback for when the server answers back.
     */
    iceCandidate: function(iceCandidateMsg, callback) {
      this.http.post("/icecandidate", {data: iceCandidateMsg}, callback);
    },

    presenceRequest: function(callback) {
      this.http.post("/presencerequest", {}, callback);
    }
  };

  BackboneEvents.mixin(Server.prototype);

  return Server;
}());

