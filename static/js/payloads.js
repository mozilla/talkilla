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

  return {Offer: Offer};
})();
