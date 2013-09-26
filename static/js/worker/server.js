/* global importScripts, BackboneEvents, HTTP */
/* jshint unused:false */

var Server = (function() {
  function Server(options) {
    this.options = options || {WSURL: ""};
    this.http = new HTTP();
    this._ws = undefined;
  }

  BackboneEvents.mixin(Server.prototype);

  Server.prototype.signin = function(assertion, callback) {
    this.http.post("/signin", {assertion: assertion}, callback);
  };

  Server.prototype.signout = function(nick, callback) {
    this.http.post("/signout", {nick: nick}, callback);
  };

  Server.prototype.connect = function(nick) {
    this.http.post("/stream", {nick: nick}, function(err, response) {
      if (err)
        return this.trigger("error", response);

      this.trigger("connected");
      this._longPolling(nick, JSON.parse(response));
    }.bind(this));
  };

  Server.prototype.autoconnect = function(nick) {
    this.http.post("/stream", {nick: nick}, function(err, response) {
      if (err)
        return this.trigger("disconnected", response);

      this.trigger("connected");
      this._longPolling(nick, JSON.parse(response));
    }.bind(this));
  };

  Server.prototype._longPolling = function(nick, events) {
    events.forEach(function(event) {
      for (var type in event) {
        this.trigger("message", type, event[type]);
        this.trigger("message:" + type, event[type]);
      }
    }.bind(this));

    this.http.post("/stream", {nick: nick}, function(err, response) {
      if (err)
        return this.trigger("disconnected", response);

      this._longPolling(nick, JSON.parse(response));
    }.bind(this));
  };

  Server.prototype.callOffer = function(data, nick, callback) {
    this.http.post("/calloffer", {data: data, nick: nick}, callback);
  };

  Server.prototype.callAccepted = function(data, nick, callback) {
    this.http.post("/callaccepted", {data: data, nick: nick}, callback);
  };

  Server.prototype.callHangup = function(data, nick, callback) {
    this.http.post("/callhangup", {data: data, nick: nick}, callback);
  };

  Server.prototype.presenceRequest = function(nick) {
    this.http.post("/presencerequest", {nick: nick});
  };

  return Server;
}());

