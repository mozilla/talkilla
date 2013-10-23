/* jshint unused:false */

var TalkillaSPA = (function() {
  function TalkillaSPA(port, server) {
    this.port = port;
    this.server = server;
    this.credentials = undefined;

    this.port.on("connect", this._onConnect.bind(this));

    this.port.on("offer", this._onCallOffer.bind(this));
    this.port.on("answer", this._onCallAnswer.bind(this));
    this.port.on("hangup", this._onCallHangup.bind(this));
    this.port.on("ice:candidate", this._onIceCandidate.bind(this));
    this.port.on("presence:request", this._onPresenceRequest.bind(this));

    this.server.on("connected", this._onServerEvent.bind(this, "connected"));
    this.server.on("unauthorized",
                   this._onServerEvent.bind(this, "unauthorized"));
    this.server.on("disconnected",
                   this._onServerEvent.bind(this, "disconnected"));
    this.server.on("message", this._onServerMessage.bind(this));
  }

  TalkillaSPA.prototype = {
    _onServerEvent: function(type, event) {
      if (type === "unauthorized")
        this.port.post("reauth-needed");
      else
        this.port.post(type, event);
    },

    _onServerMessage: function(type, event) {
      // XXX: For now we just translate the server messages to the
      // documented SPA interface. We have to update the server to
      // reflect these events.
      var mapping = {
        "incoming_call": "offer",
        "call_accepted": "answer",
        "call_hangup": "hangup",
        "ice:candidate": "ice:candidate"
      };

      if (type in mapping)
        this.port.post(mapping[type], event);
      else
        this.port.post("message", [type, event]);
    },

    _onConnect: function(credentials) {
      this.server.connect(credentials);
    },

    _onCallOffer: function(data) {
      data = {peer: data.peer, offer: data.offer, textChat: data.textChat};
      this.server.callOffer(data);
    },

    _onCallAnswer: function(data) {
      data = {peer: data.peer, answer: data.answer, textChat: data.textChat};
      this.server.callAccepted(data);
    },

    _onCallHangup: function(data) {
      data = {peer: data.peer};
      this.server.callHangup(data);
    },

    _onIceCandidate: function(data) {
      data = {peer: data.peer, candidate: data.candidate};
      this.server.iceCandidate(data);
    },

    _onPresenceRequest: function(data) {
      this.server.presenceRequest(data.nick);
    }
  };

  return TalkillaSPA;
}());
