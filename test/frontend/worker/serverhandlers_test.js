/* global afterEach, beforeEach, chai, describe, sinon, it,
   browserPort:true, currentConversation:true, serverHandlers,
   Conversation */
/* Needed due to the use of non-camelcase in the websocket topics */
/* jshint camelcase:false */
var expect = chai.expect;

describe("serverHandlers", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    currentConversation = undefined;
    sandbox.restore();
  });

  describe("#incoming_call", function() {
    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
    });

    afterEach(function() {
      browserPort = undefined;
    });

    it("should create a new conversation object with the call data",
       function() {
      var data = {
        peer: "alice",
        offer: {type: "fake", sdp: "sdp" }
      };
      serverHandlers.incoming_call(data);

      expect(currentConversation).to.be.an.instanceOf(Conversation);
      expect(currentConversation.data).to.deep.equal(data);
    });
  });

  describe("#call_accepted", function() {

    it("should call callAccepted on the conversation", function () {
      var data = {
        peer: "alice",
        answer: { type: "fake", sdp: "sdp" }
      };

      currentConversation = {
        callAccepted: sandbox.spy()
      };

      serverHandlers.call_accepted(data);

      sinon.assert.calledOnce(currentConversation.callAccepted);
      sinon.assert.calledWithExactly(currentConversation.callAccepted,
        data);
    });

  });

  describe("#call_hangup", function() {
    var callData, callHangupStub;

    beforeEach(function() {
      currentConversation = {
        callHangup: function() {}
      };

      // We save this as a stub, because currentConversation gets
      // cleared in the call_hangup function.
      callHangupStub = sandbox.stub(currentConversation, "callHangup");

      callData = {
        peer: "bob"
      };
    });

    it("should call callHangup on the conversation", function() {
      serverHandlers.call_hangup(callData);

      sinon.assert.calledOnce(callHangupStub);
      sinon.assert.calledWithExactly(callHangupStub, callData);
    });

    it("should clear the current call data", function() {
      serverHandlers.call_hangup(callData);

      expect(currentConversation).to.be.equal(undefined);
    });
  });
});
