/* global importScripts, BackboneEvents */
/* jshint unused:false */

var SPA = (function() {
  function SPA(options) {
    if (!options || !options.src)
      throw new Error("missing parameter: src");

    this.worker = new Worker(options.src);
    this.worker.onmessage = this._onMessage.bind(this);
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
      } else {
        this.trigger(topic, data);
      }
    },

    _send: function(topic, data) {
      this.worker.postMessage({topic: topic, data: data});
    },

    signin: function(assertion, callback) {
      this.once("signin-callback", function(data) {
        callback(data.err, data.response);
      });
      this._send("signin", {assertion: assertion});
    },

    signout: function(nick, callback) {
      this.once("signout-callback", function(data) {
        callback(data.err, data.response);
      });
      this._send("signout", {nick: nick});
    },

    connect: function(nick) {
      this._send("connect", {nick: nick});
    },

    autoconnect: function(nick) {
      this._send("autoconnect", {nick: nick});
    },

    callOffer: function(offer, to, textChat) {
      this._send("offer", {offer: offer, to: to, textChat: textChat});
    },

    callAnswer: function(answer, to, textChat) {
      this._send("answer", {answer: answer, to: to, textChat: textChat});
    },

    callHangup: function(to) {
      this._send("hangup", {to: to});
    },

    presenceRequest: function(nick) {
      this._send("presence:request", {nick: nick});
    }
  };

  BackboneEvents.mixin(SPA.prototype);

  return SPA;
}());
