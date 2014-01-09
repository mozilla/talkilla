/* global sinon, SPA, expect, payloads */
/* jshint unused:false */
"use strict";

describe("SPA", function() {
  var sandbox, worker, spa;

  beforeEach(function() {
    // Stub the js Worker API so we don't actually instanciate one.
    worker = {postMessage: sinon.spy()};
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker").returns(worker);

    spa = new SPA({src: "example.com"});
    sandbox.stub(spa.http, "post");
  });

  afterEach(function() {
    sandbox.restore();
    spa = undefined;
  });

  describe("constructor", function() {

    it("should instantiate a worker with the src option", function() {
      sinon.assert.calledOnce(window.Worker);
      sinon.assert.calledWithExactly(window.Worker, "example.com");
    });

    it("should throw an error if the src option is missing", function() {
      function shouldExplode() { new SPA(); }
      expect(shouldExplode).to.Throw(Error, /missing parameter: src/);
    });

    it("should define default capabilities", function() {
      expect(spa.capabilities).eql([]);
    });

  });

  describe("#on", function(done) {

    it("should trigger an event when receiving a message", function(done) {
      spa.on("foo", function(data) {
        expect(data).to.equal("bar");
        done();
      });

      worker.onmessage({data: {topic: "foo", data: "bar"}});
    });

    describe("events", function() {
      describe("ice:candidate", function() {
        it("should trigger an ice:candidate event", function(done) {
          spa.on("ice:candidate", function(iceCandidateMsg) {
            expect(iceCandidateMsg.peer).to.equal("lloyd");
            expect(iceCandidateMsg.candidate).to.equal("dummy");
            done();
          });

          worker.onmessage({
            data: {
              topic: "ice:candidate",
              data: {
                peer: "lloyd",
                candidate: "dummy"
              }
            }
          });
        });
      });

      describe("connected", function () {
        it("should trigger a connected event", function(done) {
          spa.on("connected", function() {
            done();
          });

          worker.onmessage({data: {topic: "connected"}});
        });

        it("should set connected attribute", function(done) {
          spa.on("connected", function() {
            expect(spa.connected).to.equal(true);
            done();
          });

          worker.onmessage({data: {topic: "connected"}});
        });
      });
    });
  });

  describe("#connect", function() {

    it("should send a connect event to the worker", function() {
      spa.worker.postMessage.reset();
      spa.connect("fake credentials");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "connect",
        data: "fake credentials"
      });
    });

  });

  describe("#callOffer", function() {

    it("should send a call:offer event to the worker", function() {
      var offerMsg = new payloads.Offer({offer: "fake offer", peer: "lucy"});

      spa.callOffer(offerMsg);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "offer",
        data: offerMsg
      });
    });

  });

  describe("#callAnswer", function() {

    it("should send a answer event to the worker", function() {
      var answerMsg = new payloads.Answer({
        answer: "fake answer",
        peer: "lisa"
      });

      spa.callAnswer(answerMsg);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "answer",
        data: answerMsg
      });
    });

  });

  describe("#callHangup", function() {

    it("should send a call:hangup event to the worker", function() {
      var hangupMsg = new payloads.Hangup({peer: "foo"});
      spa.callHangup(hangupMsg);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "hangup",
        data: hangupMsg
      });
    });

  });

  describe("#iceCandidate", function() {

    it("should send an ice:candidate event to the worker", function() {
      var iceCandidateMsg = new payloads.IceCandidate({
        candidate: "dummy",
        peer: "lloyd"
      });
      spa.iceCandidate(iceCandidateMsg);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "ice:candidate",
        data: iceCandidateMsg
      });
    });
  });

  describe("#initiateMove", function() {
    it("should send call move information to the server", function() {
      var moveMsg = new payloads.Move({peer: "jean-claude", callid: 42});

      spa.initiateMove(moveMsg);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "initiate-move",
        data: moveMsg.toJSON()
      });
    });
  });

  describe("#forgetCredentials", function() {
    it("should send a forget-credentials message to the spa", function() {
      spa.forgetCredentials();

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "forget-credentials",
        data: undefined
      });
    });

    it("should set connected to false", function() {
      spa.forgetCredentials();

      expect(spa.connected).to.equal(false);
    });

  });
});
