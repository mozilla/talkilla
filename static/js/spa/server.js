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
    signin: function(assertion, callback) {
      this.http.post("/signin", {assertion: assertion}, callback);
    },

    signout: function(nick, callback) {
      this.http.post("/signout", {nick: nick}, callback);
    },

    connect: function(nick) {
      this.http.post("/stream", {nick: nick}, function(err, response) {
        if (err)
          return this.trigger("error", response);

        this.nick = nick;
        this.trigger("connected");
        this._longPolling(nick, JSON.parse(response));
      }.bind(this));
    },

    autoconnect: function(nick) {
      this.http.post("/stream", {nick: nick}, function(err, response) {
        if (err)
          return this.trigger("disconnected", response);

        this.nick = nick;
        this.trigger("connected");
        this._longPolling(nick, JSON.parse(response));
      }.bind(this));
    },

    _longPolling: function(nick, events) {
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
    },

    callOffer: function(data, callback) {
      this.http.post("/calloffer", {data: data, nick: this.nick}, callback);
    },

    callAccepted: function(data, callback) {
      this.http.post("/callaccepted", {data: data, nick: this.nick}, callback);
    },

    callHangup: function(data, callback) {
      this.http.post("/callhangup", {data: data, nick: this.nick}, callback);
    },

    presenceRequest: function(nick, callback) {
      this.http.post("/presencerequest", {nick: nick}, callback);
    }
  };

  BackboneEvents.mixin(Server.prototype);

  return Server;
}());

