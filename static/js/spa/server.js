/* global importScripts, BackboneEvents, HTTP */
/* jshint unused:false */

var Server = (function() {
  function Server(options) {
    this.options = options;
    this.http = new HTTP();
    // XXX: Temporary attribute. We need proper sessions.
    this.nick = undefined;
  }

  Server.prototype = {
    connect: function(credentials) {
      this.http.post("/stream", credentials, function(err, response) {
        if (err === 400)
          return this.trigger("unauthorized", response);
        if (err !== null)
          return this.trigger("disconnected", response);

        this.nick = credentials.nick;
        this.trigger("connected");
        this._longPolling(credentials.nick, JSON.parse(response));
      }.bind(this));
    },

    _longPolling: function(nick, events) {
      events.forEach(function(event) {
        this.trigger("message", event.topic, event.data);
        this.trigger("message:" + event.topic, event.data);
      }.bind(this));

      this.http.post("/stream", {nick: nick}, function(err, response) {
        if (err === 400)
          return this.trigger("unauthorized", response);
        if (err !== null)
          return this.trigger("disconnected", response);

        this._longPolling(nick, JSON.parse(response));
      }.bind(this));
    },

    /**
     * Initiate a call via the /calloffer API
     *
     * @param {payloads.Offer} offerMsg An Offer payload to initiate the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callOffer: function(offerMsg, callback) {
      this.http.post("/calloffer", {
        data: offerMsg,
        nick: this.nick
      }, callback);
    },

    /**
     * Accept a call via the /callanswer API
     *
     * @param {payloads.Answer} answerMsg An Answer payload to accept the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callAccepted: function(answerMsg, callback) {
      this.http.post("/callaccepted", {
        data: answerMsg,
        nick: this.nick
      }, callback);
    },

    /**
     * End a call via the /callhangup API
     *
     * @param {payloads.Hangup} hangupMsg A Hangup payload to accept the call.
     * @param {function} callback A callback for when the server answers back.
     */
    callHangup: function(hangupMsg, callback) {
      this.http.post("/callhangup", {
        data: hangupMsg,
        nick: this.nick
      }, callback);
    },

    /**
     * Send a new ICE candidate via /icecandidate
     *
     * @param {payloads.IceCandidate} iceCandidateMsg An IceCandidate
     * payload to send to a peer.
     * @param {function} callback A callback for when the server answers back.
     */
    iceCandidate: function(iceCandidateMsg, callback) {
      this.http.post("/icecandidate", iceCandidateMsg, callback);
    },

    presenceRequest: function(nick, callback) {
      this.http.post("/presencerequest", {nick: nick}, callback);
    }
  };

  BackboneEvents.mixin(Server.prototype);

  return Server;
}());

