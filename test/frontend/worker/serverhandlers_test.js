/* global afterEach, beforeEach, chai, describe, sinon, it,
   browserPort:true, currentCall:true, serverHandlers, handlers */
/* Needed due to the use of non-camelcase in the websocket topics */
/* jshint camelcase:false */
var expect = chai.expect;

describe("serverHandlers", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    currentCall = undefined;
    sandbox.restore();
  });

  describe("#incoming_call", function() {
    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
    });

    afterEach(function() {
      browserPort = undefined;
    });

    it("should store the current call data", function() {
      var data = {
        other: "alice",
        offer: {type: "fake", sdp: "sdp" }
      };
      serverHandlers.incoming_call(data);

      expect(currentCall).to.deep.equal({port: undefined, data: data});
    });

    it("should open a chat window", function() {
      serverHandlers.incoming_call({});

      sinon.assert.calledOnce(browserPort.postEvent);
      sinon.assert.calledWithExactly(browserPort.postEvent,
        'social.request-chat', "chat.html");
    });
  });

  describe("#call_accepted", function() {

    it("should post talkilla.call-establishment to the chat window",
      function() {
        var port = {postEvent: sinon.spy()};
        var data = {
          other: "alice",
          answer: { type: "fake", sdp: "sdp" }
        };

        currentCall = {port: port, data: {other: "alice"}};

        serverHandlers.call_accepted(data);

        sinon.assert.calledOnce(port.postEvent);
        sinon.assert.calledWithExactly(port.postEvent,
          'talkilla.call-establishment', data);
      });
  });

  describe("#call_hangup", function() {
    var callData;

    beforeEach(function() {
      handlers.postEvent = sandbox.spy();
      callData = {
        other: "bob"
      };
      currentCall = {port: {postEvent: handlers.postEvent}, data: callData};
    });

    it("should notify the chat window", function() {
      serverHandlers.call_hangup(callData);

      sinon.assert.calledOnce(handlers.postEvent);
      sinon.assert.calledWithExactly(handlers.postEvent,
        'talkilla.call-hangup', callData);
    });

    it("should clear the current call data", function() {
      serverHandlers.call_hangup(callData);

      expect(currentCall).to.be.equal(undefined);
    });
  });
});
