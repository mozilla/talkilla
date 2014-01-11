/*global _, chai, payloads */
"use strict";

var expect = chai.expect;

describe("payloads", function() {
  function create(PayloadType, data) {
    return function() {
      return new PayloadType(data);
    };
  }

  function expectJSONEqual(a, b) {
    // test that the two JSON object serializations are equivalent
    expect(JSON.parse(JSON.stringify(a))).eql(JSON.parse(JSON.stringify(b)));
  }

  describe("payloads.Payload", function() {
    var Offer = payloads.Payload.define({
      callid: Number,
      peer:   String,
      offer:  mozRTCSessionDescription
    });

    describe("#constructor", function() {
      it("should validate payload data", function() {
        var offerData = {
          callid: 42,
          peer: "jb",
          offer: new mozRTCSessionDescription({})
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
          offer: new mozRTCSessionDescription({})
        };

        expect(create(Offer, offerData))
          .Throw(TypeError, /invalid dependency: callid; expected Number/);
      });

      it("should populate only specified properties", function() {
        var offerData = {
          callid: 42,
          peer: "jb",
          offer: new mozRTCSessionDescription({}),
        };
        var augmented = _.extend(offerData, {foo: 1337});

        expectJSONEqual(new Offer(augmented), offerData);
      });
    });
  });
});
