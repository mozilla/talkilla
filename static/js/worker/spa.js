/* global importScripts, BackboneEvents, HTTP */
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

      if (topic === "message") {
        type = data.shift();
        data = data.shift();
        this.trigger("message", type, data);
        this.trigger("message:" + type, data);
      } else if (topic === "offer") {
        this.trigger(topic, data.offer, data.peer, data.textChat);
      } else if (topic === "answer") {
        this.trigger(topic, data.answer, data.peer, data.textChat);
      } else if (topic === "hangup") {
        this.trigger(topic, data.peer);
      } else if (topic === "ice:candidate") {
        this.trigger(topic, data.peer, data.candidate);
      } else {
        this.trigger(topic, data);
      }
    },

    _send: function(topic, data) {
      this.worker.postMessage({topic: topic, data: data});
    },

    signin: function(assertion, callback) {
      this.http.post("/signin", {assertion: assertion}, callback);
    },

    signout: function(nick, callback) {
      this.http.post("/signout", {nick: nick}, callback);
    },

    connect: function(credentials) {
      this._send("connect", credentials);
    },

    callOffer: function(offer, peer, textChat) {
      this._send("offer", {offer: offer, peer: peer, textChat: textChat});
    },

    callAnswer: function(answer, peer, textChat) {
      this._send("answer", {answer: answer, peer: peer, textChat: textChat});
    },

    callHangup: function(peer) {
      this._send("hangup", {peer: peer});
    },

    iceCandidate: function(peer, candidate) {
      this._send("ice:candidate", {peer: peer, candidate: candidate});
    },

    presenceRequest: function(nick) {
      this._send("presence:request", {nick: nick});
    }
  };

  BackboneEvents.mixin(SPA.prototype);

  return SPA;
}());
