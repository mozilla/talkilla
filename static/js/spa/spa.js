/* global DummyWorker, BackboneEvents */
/* jshint unused:false */

var SPA = (function() {
  function SPA(options) {
    this.worker = new DummyWorker(); // XXX: A real Worker needs an URL
    this.worker.onmessage = this._onMessage.bind(this);
  }

  BackboneEvents.mixin(SPA.prototype);

  SPA.prototype._onMessage = function(event) {
    if (event.topic === "message") {
      var type = event.data.shift();
      var data = event.data.shift();
      this.trigger("message", type, data);
      this.trigger("message:" + type, data);
    } else {
      this.trigger(event.topic, event.data);
    }
  };

  SPA.prototype._send = function(topic, data) {
    this.worker.postMessage({topic: topic, data: data});
  };

  SPA.prototype.signin = function(assertion, callback) {
    this.once("signin-callback", function(data) {
      callback(data.err, data.response);
    });
    this._send("signin", {assertion: assertion});
  };

  SPA.prototype.signout = function(nick, callback) {
    this.once("signout-callback", function(data) {
      callback(data.err, data.response);
    });
    this._send("signout", {nick: nick});
  };

  SPA.prototype.connect = function(nick) {
    this._send("connect", {nick: nick});
  };

  SPA.prototype.autoconnect = function(nick) {
    this._send("autoconnect", {nick: nick});
  };

  SPA.prototype.callOffer = function(data, nick, callback) {
    this.once("call:offer-callback", function(data) {
      callback(data.err, data.response);
    });
    this._send("call:offer", {data: data, nick: nick});
  };

  SPA.prototype.callAccepted = function(data, nick, callback) {
    this.once("call:accepted-callback", function(data) {
      callback(data.err, data.response);
    });
    this._send("call:accepted", {data: data, nick: nick});
  };

  SPA.prototype.callHangup = function(data, nick, callback) {
    this.once("call:hangup-callback", function(data) {
      callback(data.err, data.response);
    });
    this._send("call:hangup", {data: data, nick: nick});
  };

  return SPA;
}());
