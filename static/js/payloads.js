/* jshint unused:false */

var payloads = (function() {
  "use strict";

  /**
   * Offer payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   * - {mozRTCSessionDescription} offer, a sdp offer
   *
   * Optional attributes:
   *
   * - {Boolean} textChat, does the call involve text chat?
   * - {Boolean} upgrade, is the call an upgrade?
   *
   */
  function Offer(data) {
    this.callid   = data.callid;
    this.peer     = data.peer;
    this.offer    = data.offer;
    this.textChat = data.textChat || false;
    this.upgrade  = data.upgrade  || false;
  }

  Offer.prototype = {
    toJSON: function() {
      return {
        callid: this.callid,
        peer: this.peer,
        offer: this.offer,
        textChat: this.textChat,
        upgrade: this.upgrade
      };
    }
  };

  /**
   * Answer payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {String} peer, the user to call
   * - {mozRTCSessionDescription} answer, a sdp answer
   *
   * Optional attributes:
   *
   * - {Boolean} textChat, does the call involve text chat?
   *
   */
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

  /**
   * Hangup payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   *
   */
  function Hangup(data) {
    this.callid = data.callid;
    this.peer = data.peer;
  }

  Hangup.prototype = {
    toJSON: function() {
      return {peer: this.peer, callid: this.callid};
    }
  };

  /**
   * IceCandidate payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {String} peer, the user to call
   * - {mozRTCIceCandidate} candidate, an ICE candidate
   *
   */
  function IceCandidate(data) {
    this.peer = data.peer;
    this.candidate = data.candidate;
  }

  IceCandidate.prototype = {
    toJSON: function() {
      return {
        peer: this.peer,
        candidate: this.candidate
      };
    }
  };

  /**
   * SPASpec payload. This is an object describing a particular SPA.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {String} src, the url from which to load the SPA
   * - {Object} credentials, an opaque data structure carrying credentials
   *
   */
  function SPASpec(data) {
    this.src = data.src;
    this.credentials = data.credentials;
  }

  SPASpec.prototype = {
    toJSON: function() {
      return {
        src: this.src,
        credentials: this.credentials
      };
    }
  };

  return {
    Offer: Offer,
    Answer: Answer,
    Hangup: Hangup,
    IceCandidate: IceCandidate,
    SPASpec: SPASpec
  };
})();
