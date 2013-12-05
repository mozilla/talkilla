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
  }

  Offer.prototype = {
    toJSON: function() {
      return {
        callid: this.callid,
        peer: this.peer,
        offer: this.offer
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
  }

  Answer.prototype = {
    toJSON: function() {
      return {
        peer: this.peer,
        answer: this.answer
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
   * Move payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   *
   */
  function Move(data) {
    this.callid = data.callid;
    this.peer = data.peer;
  }

  Move.prototype = {
    toJSON: function() {
      return {peer: this.peer, callid: this.callid};
    }
  };

  /**
   * Move accept payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   *
   */
  function MoveAccept(data) {
    this.callid = data.callid;
    this.peer = data.peer;
  }

  MoveAccept.prototype = {
    toJSON: function() {
      return {peer: this.peer, callid: this.callid};
    }
  };

  /**
   * Hold payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   *
   */
  function Hold(data) {
    this.callid = data.callid;
    this.peer = data.peer;
  }

  Hold.prototype = {
    toJSON: function() {
      return {peer: this.peer, callid: this.callid};
    }
  };

  /**
   * Resume payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   * - {Object} media An object containing one item, video which
   *                  is a boolean and should be set to true to
   *                  resume with video
   */
  function Resume(data) {
    this.callid = data.callid;
    this.peer = data.peer;
    this.media = { video: data.media.video };
  }

  Resume.prototype = {
    toJSON: function() {
      return {peer: this.peer, callid: this.callid, media: {
        video: this.media.video
      }};
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
    this.name = data.name;
    this.src = data.src;
    this.credentials = data.credentials;
  }

  SPASpec.prototype = {
    toJSON: function() {
      return {
        name: this.name,
        src: this.src,
        credentials: this.credentials
      };
    }
  };

  return {
    Offer: Offer,
    Answer: Answer,
    Hangup: Hangup,
    Hold: Hold,
    Resume: Resume,
    IceCandidate: IceCandidate,
    SPASpec: SPASpec,
    Move: Move,
    MoveAccept: MoveAccept
  };
})();
