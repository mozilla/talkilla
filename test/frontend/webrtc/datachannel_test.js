/*global sinon, WebRTC, tnetbin, chai */
"use strict";

var expect = chai.expect;

describe("WebRTC.DataChannel", function() {
  var sandbox, datachannel;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    var dc = {send: sinon.spy(), readyState: "open"};
    datachannel = new WebRTC.DataChannel(dc);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("datachannel handlers", function() {

    describe("dc#onopen", function() {

      var messages = ["1st", "2nd", "3rd"];

      beforeEach(function() {
        datachannel.queue = messages;
      });

      it("should flush the queued messages", function() {
        var send = datachannel.dc.send;
        datachannel.dc.onopen();

        sinon.assert.calledThrice(send);
        sinon.assert.calledWithExactly(send, tnetbin.encode(messages[0]));
        sinon.assert.calledWithExactly(send, tnetbin.encode(messages[1]));
        sinon.assert.calledWithExactly(send, tnetbin.encode(messages[2]));
      });

      it("should empty the queue", function() {
        datachannel.dc.onopen();
        expect(datachannel.queue).to.deep.equal([]);
      });

    });

    describe("dc#onmessage", function() {

      it("should trigger a message event", function(done) {
        var event = {data: tnetbin.encode("somedata")};
        datachannel.on("message", function(data) {
          expect(data).to.equal("somedata");
          done();
        });

        datachannel.dc.onmessage(event);
      });

    });

    describe("dc#onerror", function() {

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

    it("should queue the message if the datachannel is not ready", function() {
      var messages = ["1st", "2nd", "3rd"];
      datachannel.dc.readyState = "connecting";
      messages.forEach(function(message) {
        datachannel.send(message);
      });

      expect(datachannel.queue).to.deep.equal(messages);
      sinon.assert.notCalled(datachannel.dc.send);
    });

  });

});
