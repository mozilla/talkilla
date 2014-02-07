/* global payloads */
/* jshint unused:false */

var TalkillaSPA = (function() {
  "use strict";

  function TalkillaSPA(port, server, options) {
    this.port = port;
    this.server = server;
    this.credentials = undefined;
    this.capabilities = options && options.capabilities || ["call"];

    this.port.on("connect", this._onConnect.bind(this));

    this.port.on("offer", this._onCallOffer.bind(this));
    this.port.on("answer", this._onCallAnswer.bind(this));
    this.port.on("hangup", this._onCallHangup.bind(this));
    this.port.on("ice:candidate", this._onIceCandidate.bind(this));
    this.port.on("forget-credentials", this._onForgetCredentials.bind(this));
    this.port.on("message", this._onMessage.bind(this));

    this.server.on("connected", this._onServerEvent.bind(this, "connected"));
    this.server.on("unauthorized",
                   this._onServerEvent.bind(this, "unauthorized"));
    this.server.on("reconnection",
                   this._onServerEvent.bind(this,"reconnection"));
    this.server.on("message", this._onServerMessage.bind(this));

    // so we can get instantshare notifications without being logged in
    // XXX get rid of this in favor of something that doesn't require
    // an open connection and server round trip
    // (eg indexedDB or proxied postMessage)
    this.server.connect();
  }

  TalkillaSPA.prototype = {
    _onMessage: function(message) {
      // The Talkilla SPA does not support SPAChannel
    },

    _onServerEvent: function(type, event) {
      if (type === "unauthorized")
        this.port.post("reauth-needed");
      else if (type === "reconnection")
        this.port.post("reconnection", (new payloads.Reconnection(event)));
      else if (type === "connected") {
        if ("email" in this) {
          this.port.post(type, {
            addresses: [{type: "email", value: this.email}],
            capabilities: this.capabilities
          });
          this.server.presenceRequest();
        } else {
          this.port.post(type, {
            capabilities: this.capabilities
          });
        }
      }
      else
        this.port.post(type, event);
    },

    _onServerMessage: function(type, event) {
      // XXX: For now we just translate the server messages to the
      // documented SPA interface. We have to update the server to
      // reflect these events.
      switch (type) {
        case "offer":
          this.port.post("offer", (new payloads.Offer(event)));
          break;

        case "answer":
          this.port.post("answer", (new payloads.Answer(event)));
          break;

        case "hangup":
          this.port.post("hangup", (new payloads.Hangup(event)));
          break;

        case "ice:candidate":
          this.port.post("ice:candidate", (new payloads.IceCandidate(event)));
          break;

        case "instantshare":
          this.port.post("instantshare", (new payloads.InstantShare(event)));
          break;

        default:
          this.port.post(type, event);
          break;
      }
    },

    _onConnect: function(credentials) {
      this.email = credentials.email;
      this.server.connect();
    },

    /**
     * Called when initiating a call.
     *
     * @param {Object} offerData a data structure representation of a
     * payloads.Offer.
     */
    _onCallOffer: function(offerData) {
      var offerMsg = new payloads.Offer(offerData);
      this.server.callOffer(offerMsg);
    },

    /**
     * Called when accepting a call.
     *
     * @param {Object} answerData a data structure representation of a
     * payloads.Answer.
     */
    _onCallAnswer: function(answerData) {
      var answerMsg = new payloads.Answer(answerData);
      this.server.callAccepted(answerMsg);
    },

    /**
     * Called when hanging up a call.
     *
     * @param {Object} hangupData a data structure representation of a
     * payloads.Hangup.
     */
    _onCallHangup: function(hangupData) {
      var hangupMsg = new payloads.Hangup(hangupData);
      this.server.callHangup(hangupMsg);
    },

    /**
     * Called when sending a new ice candidate.
     *
     * @param {Object} iceCandidateData a data structure
     * representation of a payloads.IceCandidate.
     */
    _onIceCandidate: function(iceCandidateData) {
      var iceCandidateMsg = new payloads.IceCandidate(iceCandidateData);
      this.server.iceCandidate(iceCandidateMsg);
    },

    _onForgetCredentials: function() {
      this.server.disconnect();
      this.server.signout();
    }
  };

  return TalkillaSPA;
}());
