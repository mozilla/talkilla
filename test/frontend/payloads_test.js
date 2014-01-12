/*global _, chai, payloads */
"use strict";

var expect = chai.expect;

describe("payloads", function() {
  function create(PayloadType, data) {
    return function() {
      return new PayloadType(data);
    };
  }

  /**
   * Expects that two JSON object serializations are equivalent.
   *
   * @param  {Object} a
   * @param  {Object} b
   */
  function expectJSONEqual(a, b) {
    expect(JSON.parse(JSON.stringify(a))).eql(JSON.parse(JSON.stringify(b)));
  }

  describe("payloads.Payload", function() {
    var Offer = payloads.Payload.define({
      callid: Number,
      peer:   String,
      offer:  Object
    });

    describe("#constructor", function() {
      it("should validate payload data", function() {
        var offerData = {
          callid: 42,
          peer: "jb",
          offer: {fake: true}
        };
        expectJSONEqual(new Offer(offerData), offerData);
      });

      it("should invalidate payload data on missing properties", function() {
        expect(create(Offer, {}))
          .Throw(TypeError, /missing required callid, peer, offer/);
        expect(create(Offer, {callid: 42}))
          .Throw(TypeError, /missing required peer, offer/);
      });

      it("should invalidate payload data on unexpected datatype", function() {
        var offerData = {
          callid: "invalid",
          peer: "jb",
          offer: {fake: true}
        };

        expect(create(Offer, offerData))
          .Throw(TypeError, /invalid dependency: callid; expected Number/);
      });

      it("should populate only specified properties", function() {
        var offerData = {
          callid: 42,
          peer: "jb",
          offer: {fake: true},
        };
        var augmented = _.extend(offerData, {foo: 1337});

        expectJSONEqual(new Offer(augmented), offerData);
      });
    });
  });
});
