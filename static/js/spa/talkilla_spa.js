/* jshint unused:false */

var TalkillaSPA = (function() {
  function TalkillaSPA(port, server) {
    this.port = port;
    this.server = server;

    this.port.on("connect", this._onConnect.bind(this));
    this.port.on("autoconnect", this._onAutoconnect.bind(this));

    this.port.on("signin", this._onSignin.bind(this));
    this.port.on("signout", this._onSignout.bind(this));
    this.port.on("call:offer", this._onCallOffer.bind(this));
    this.port.on("call:accepted", this._onCallAccepted.bind(this));
    this.port.on("call:hangup", this._onCallHangup.bind(this));

    this.server.on("connected", this._onServerEvent.bind(this, "connected"));
    this.server.on("disconnected",
                   this._onServerEvent.bind(this, "disconnected"));
    this.server.on("message", this._onServerMessage.bind(this));
  }

  TalkillaSPA.prototype._onServerEvent = function(type, event) {
    this.port.post(type, event);
  };

  TalkillaSPA.prototype._onServerMessage = function(type, event) {
    this.port.post("message", [type, event]);
  };

  TalkillaSPA.prototype._onConnect = function(data) {
    this.server.connect(data.nick);
  };

  TalkillaSPA.prototype._onAutoconnect = function(data) {
    this.server.autoconnect(data.nick);
  };

  TalkillaSPA.prototype._onSignin = function(data) {
    this.server.signin(data.assertion, function(err, response) {
      this.port.post("signin-callback", {err: err, response: response});
    }.bind(this));
  };

  TalkillaSPA.prototype._onSignout = function(data) {
    this.server.signout(data.nick, function(err, response) {
      this.port.post("signout-callback", {err: err, response: response});
    }.bind(this));
  };

  TalkillaSPA.prototype._onCallOffer = function(data) {
    this.server.callOffer(data.data, data.nick, function(err, response) {
      this.port.post("call:offer-callback", {err: err, response: response});
    }.bind(this));
  };

  TalkillaSPA.prototype._onCallAccepted = function(data) {
    this.server.callAccepted(data.data, data.nick, function(err, response) {
      this.port.post("call:accepted-callback", {err: err, response: response});
    }.bind(this));
  };

  TalkillaSPA.prototype._onCallHangup = function(data) {
    this.server.callHangup(data.data, data.nick, function(err, response) {
      this.port.post("call:hangup-callback", {err: err, response: response});
    }.bind(this));
  };

  return TalkillaSPA;
}());