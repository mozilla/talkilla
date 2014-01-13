/* global importScripts, validate */
/* jshint unused:false */

// If within a worker, load the validate dependency
if (typeof importScripts === "function")
  importScripts("/js/validate.js");

var payloads = (function() {
  "use strict";

  /**
   * Data payload. Accepts a values object and a validation schema object,
   * validates the values against it and attaches validated values as instance
   * properties.
   *
   * @constructor
   * @param {Object} values Values object
   * @param {Object} schema Validation schema
   */
  function Payload(values, schema) {
    var validatedData = new validate.Validator(schema || {})
                                    .validate(values || {});
    for (var prop in validatedData)
      this[prop] = validatedData[prop];
  }

  /**
   * Creates a new Payload constructor featuring a given data validation schema.
   *
   * @param  {Object} schema Validationn schema
   * @return {Function} A Payload constructor
   */
  Payload.define = function(schema) {
    var PayloadCtor = function(values) {
      Payload.call(this, values, schema);
    };
    PayloadCtor.prototype = Object.create(Payload.prototype);
    return PayloadCtor;
  };

  /**
   * Offer payload.
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the username to call
   * - {mozRTCSessionDescription} offer, a sdp offer
   * - {Boolean} upgrade, is this a call upgrade?
   */
  var Offer = Payload.define({
    callid:  Number,
    peer:    String,
    offer:   Object,
    upgrade: Boolean
  });

  /**
   * Answer payload.
   *
   * - {String} peer, the user to call
   * - {mozRTCSessionDescription} answer, a sdp answer
   */
  var Answer = Payload.define({
    peer:   String,
    answer: Object
  });

  /**
   * Hangup payload.
   *
   * @param {Object} data
   *
   * data attributes:
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   */
  var Hangup = Payload.define({
    callid: Number,
    peer:   String
  });

  /**
   * Move payload.
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   */
  var Move = Payload.define({
    callid: Number,
    peer:   String
  });

  /**
   * Move accept payload.
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   */
  var MoveAccept = Payload.define({
    callid: Number,
    peer:   String
  });

  /**
   * Hold payload.
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   */
  var Hold = Payload.define({
    callid: Number,
    peer:   String
  });

  /**
   * Resume payload.
   *
   * - {Integer} callid, the id of the call being initiated
   * - {String} peer, the user to call
   * - {Object} media An object containing one item, video which
   *                  is a boolean and should be set to true to
   *                  resume with video
   */
  var Resume = Payload.define({
    callid: Number,
    peer:   String,
    media:  Object
  });

  /**
   * IceCandidate payload.
   *
   * - {String} peer, the user to call
   * - {mozRTCIceCandidate} candidate, an ICE candidate (can be null)
   */
  var IceCandidate = Payload.define({
    peer:      String,
    candidate: [Object, null]
  });

  /**
   * SPASpec payload. This is an object describing a particular SPA.
   *
   * - {String} name, the SPA name
   * - {String} src, the url from which to load the SPA
   * - {Object} credentials, an opaque data structure carrying credentials
   */
  var SPASpec = Payload.define({
    name:        String,
    src:         String,
    credentials: Object
  });

  /**
   * SPAChannelMessage payload. Arbitrary message sent through the SPA.
   *
   * - {String} peer, the user to call
   * - {String} type, the type of the message
   * - {Object|String} message, a message or an opaque data structure carrying
   *                            specific attributes of the message
   */
  var SPAChannelMessage = Payload.define({
    peer:    String,
    type:    String,
    message: [Object, String]
  });

  return {
    Payload: Payload,
    Offer: Offer,
    Answer: Answer,
    Hangup: Hangup,
    Hold: Hold,
    Resume: Resume,
    IceCandidate: IceCandidate,
    SPASpec: SPASpec,
    Move: Move,
    MoveAccept: MoveAccept,
    SPAChannelMessage: SPAChannelMessage
  };
})();
