/*global sinon, WebRTC, tnetbin, chai */
"use strict";

var expect = chai.expect;

describe("WebRTC.DataChannel", function() {
  var sandbox, datachannel;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    var dc = {send: sinon.spy()};
    var pc = {
      createDataChannel: function() {
        return dc;
      }
    };
    datachannel = new WebRTC.DataChannel(pc);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("datachannel events", function() {

    describe("onopen", function() {

      it("should trigger a ready event", function(done) {
        var event = {data: tnetbin.encode("somedata")};
        datachannel.on("ready", function(dc) {
          expect(dc).to.equal(datachannel);
          done();
        });

        datachannel.dc.onopen(event);
      });

    });

    describe("onmessage", function() {

      it("should trigger a message event", function(done) {
        var event = {data: tnetbin.encode("somedata")};
        datachannel.on("message", function(data) {
          expect(data).to.equal("somedata");
          done();
        });

        datachannel.dc.onmessage(event);
      });

    });

    describe("onerror", function() {

      it("should trigger an error event", function(done) {
        datachannel.on("error", function(err) {
          expect(err).to.equal("some error");
          done();
        });

        datachannel.dc.onerror("some error");
      });

    });

  });

  describe("#send", function() {

    it("should send encoded data to the datachannel", function() {
      var message = tnetbin.encode("some data");

      datachannel.send("some data");

      sinon.assert.calledOnce(datachannel.dc.send);
      sinon.assert.calledWithExactly(datachannel.dc.send, message);
    });

    it("should trigger an error if something went wrong", function(done) {
      datachannel.dc.send = function() {
        throw new Error("datachannel error");
      };
      datachannel.on("error", function(err) {
        expect(err).to.match(/datachannel error/);
        done();
      });

      datachannel.send("some data");
    });

  });

});
