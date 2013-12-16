/* global importScripts, BackboneEvents, HTTP */
/* jshint unused:false */

/**
 * Handles the server connection and events.
 **/
var Server = (function() {
  "use strict";

  function Server(options) {
    this.options = options;
    this.http = new HTTP();
    this.currentXHR = undefined;

    this.connectionAttempts = 0;
    this.reconnectOnError = options && options.reconnectOnError;

    // Try to reconnect in case of network error.
    if (this.reconnectOnError !== false){
      this.on("network-error", function(response){
        this.reconnect();
      }.bind(this));
    }
  }

  Server.prototype = {
    connect: function() {
      // XXX Timeout value to depend on LONG_POLLING_TIMEOUT.
      var xhr = this.http.post("/stream", {firstRequest: true, timeout: 21000},
        function(err, response) {
          if (err === 400)
            return this.trigger("unauthorized", response);
          if (err !== null)
            return this.trigger("network-error", response);

          this.trigger("connected");
          this._longPolling(JSON.parse(response));
        }.bind(this));
      this.currentXHR = xhr;
    },

    /**
     * Try to reconnect to the server if the connection was lost.
     *
     * Try a reconnection every second for the first 10 seconds,
     * then every minute and stop after one attempt.
     **/
    reconnect: function() {
      if (this.connectionAttempts === 0){
        this.connectionAttempts += 1;
        this.connect();
      } else {
        var timeout;
        if (this.connectionAttempts <= 10)
          timeout = 1000; // One second.
        else if (this.connectionAttempts === 11)
          timeout = 1000 * 60; // One minute.
        else {
          // After one minute, reset the number of attempts and
          // stop retrying.
          this.connectionAttempts = 0;

          // Send a signal saying we're disconnected.
          this.trigger("disconnected");
          return;
        }
        this.trigger("reconnecting", {"attempt": this.connectionAttempts,
                                      "timeout": timeout});
        setTimeout(function() {
          this.connectionAttempts += 1;
          this.connect();
        }.bind(this), timeout);
      }
    },

    disconnect: function() {
      if (this.currentXHR)
        this.currentXHR.abort();
      this.trigger("disconnected");
    },

    signout: function() {
      this.http.post("/signout", {});
    },

    _longPolling: function(events) {
      events.forEach(function(event) {
        this.trigger("message", event.topic, event.data);
        this.trigger("message:" + event.topic, event.data);
      }.bind(this));

      // XXX Timeout value to depend on LONG_POLLING_TIMEOUT.
      this.currentXHR =
        this.http.post("/stream", {timeout: 21000}, function(err, response) {
          if (err === 400)
            return this.trigger("unauthorized", response);
          if (err !== null)
            return this.trigger("network-error", response);

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

