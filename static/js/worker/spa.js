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

    callOffer: function(data, nick, callback) {
      this.once("call:offer-callback", function(data) {
        callback(data.err, data.response);
      });
      this._send("call:offer", {data: data, nick: nick});
    },

    callAccepted: function(data, nick, callback) {
      this.once("call:accepted-callback", function(data) {
        callback(data.err, data.response);
      });
      this._send("call:accepted", {data: data, nick: nick});
    },

    callHangup: function(data, nick, callback) {
      this.once("call:hangup-callback", function(data) {
        callback(data.err, data.response);
      });
      this._send("call:hangup", {data: data, nick: nick});
    },

    presenceRequest: function(nick) {
      this._send("presence:request", {nick: nick});
    }
  };

  BackboneEvents.mixin(SPA.prototype);

  return SPA;
}());
