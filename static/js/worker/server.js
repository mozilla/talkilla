/* global importScripts, BackboneEvents, HTTP */
/* jshint unused:false */

var Server = (function() {
  function Server(options) {
    this.options = options || {WSURL: ""};
    this.http = new HTTP();
    this._ws = undefined;
  }

  BackboneEvents.mixin(Server.prototype);

  Server.prototype._setupWebSocket = function(ws) {
    ws.onopen    = this.trigger.bind(this, "connected");
    ws.onmessage = this._onWebSocketMessage.bind(this);
    ws.onerror   = this.trigger.bind(this, "error");
    ws.onclose   = this.trigger.bind(this, "disconnected");
    return ws;
  };

  Server.prototype._tryWebSocket = function(ws) {
    ws.onopen = function(event) {
      this._setupWebSocket(ws);
      this.trigger("connected", event);
    }.bind(this);
    ws.onerror = function(event) {
      this.trigger("disconnected");
    }.bind(this);

    return ws;
  };

  Server.prototype._onWebSocketMessage = function(event) {
    var data = JSON.parse(event.data);
    for (var eventType in data) {
      this.trigger("message", eventType, data[eventType]);
      this.trigger("message:" + eventType, data[eventType]);
    }
  };

  Server.prototype.signin = function(assertion, callback) {
    this.http.post("/signin", {assertion: assertion}, callback);
  };

  Server.prototype.signout = function(nick, callback) {
    this.http.post("/signout", {nick: nick}, callback);
  };

  Server.prototype.connect = function(nick) {
    var ws = new WebSocket(this.options.WSURL + "?nick=" + nick);
    this._ws = this._setupWebSocket(ws);
  };

  Server.prototype.autoconnect = function(nick) {
    var ws = new WebSocket(this.options.WSURL + "?nick=" + nick);
    this._ws = this._tryWebSocket(ws);
  };

  Server.prototype.send = function(data) {
    this._ws.send(JSON.stringify(data));
  };

  return Server;
}());

