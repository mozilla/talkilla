/* jshint unused:false */

var payloads = (function() {
  "use strict";

  function Offer(data) {
    this.peer     = data.peer;
    this.offer    = data.offer;
    this.textChat = data.textChat || false;
    this.upgrade  = data.upgrade  || false;
  }

  Offer.prototype = {
    toJSON: function() {
      return {
        peer: this.peer,
        offer: this.offer,
        textChat: this.textChat,
        upgrade: this.upgrade
      };
    }
  };

  function Answer(data) {
    this.peer     = data.peer;
    this.answer   = data.answer;
    this.textChat = data.textChat || false;
  }

  Answer.prototype = {
    toJSON: function() {
      return {
        peer: this.peer,
        answer: this.answer,
        textChat: this.textChat
      };
    }
  };

  function Hangup(data) {
    this.peer = data.peer;
  }

  Hangup.prototype = {
    toJSON: function() {
      return {peer: this.peer};
    }
  };

  return {
    Offer: Offer,
    Answer: Answer,
    Hangup: Hangup
  };
})();
