/*global expect, sinon, payloads, Conversation */
/* jshint expr:true */
"use strict";

describe("Conversation", function() {
  var sandbox, conversation, port;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker").returns({postMessage: sinon.spy()});

    // XXX We should probably be using Mocks or some other form of stubbing
    // for some of the objects here.
    conversation = new Conversation({
      capabilities: [],
      peer: { username: "florian" },
      browserPort: {
        postEvent: sandbox.spy()
      },
      user: {
        name: "romain"
      }
    });

    port = {
      postEvent: sandbox.spy()
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("initialize", function() {
    it("should store the peer", function() {
      expect(conversation.peer).
                      to.deep.equal({username: "florian"});
    });

  });

  describe("#windowOpened", function() {
    it("should store the port", function() {
      conversation.windowOpened(port);

      expect(conversation.port).to.be.equal(port);
    });

    it("should post a talkilla.conversation-open event for a " +
      "non-incoming call", function() {
        conversation.windowOpened(port);

        sinon.assert.calledOnce(conversation.port.postEvent);
        sinon.assert.calledWith(conversation.port.postEvent,
          "talkilla.conversation-open", {
          capabilities: [],
          peer: conversation.peer,
          user: conversation.user.name
        });
      });

    it("should send any outstanding messages when the port is opened",
      function() {
        var messages = [
          {topic: "talkilla.ice-candidate", context: { candidate: "dummy1" }},
          {
            topic: "talkilla.conversation-incoming",
            context: {
              offer: { sdp: "fake" },
              peer: "florian"
            }
          }
        ];

        conversation.messageQueue = messages;
        conversation.windowOpened(port);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWithExactly(port.postEvent,
          messages[0].topic, messages[0].data);
        sinon.assert.calledWithExactly(port.postEvent,
          messages[1].topic, messages[1].data);

        expect(conversation.messageQueue)
              .to.deep.equal([]);
      });
  });

  describe("#handleIncomingCall", function() {
    var offer;

    beforeEach(function() {
      conversation.port = port;
      offer = {
        peer: "florian",
        offer: {sdp: "fake"}
      };
    });

    afterEach(function() {
      offer = undefined;
    });

    it("should return false if the conversation is not for the peer",
      function() {
        offer.peer = "alexis";
        var result = conversation.handleIncomingCall(offer);

        expect(result).to.be.equal(false);
      });

    it("should return true if the conversation is for the peer",
      function() {
        var result = conversation.handleIncomingCall(offer);

        expect(result).to.be.equal(true);
      });

    it("should post a talkilla.conversation-incoming event for an " +
       "incoming call", function() {
        conversation.handleIncomingCall(offer);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
          "talkilla.conversation-incoming", offer);
      });

  });

  describe("#handleIncomingText", function() {

    beforeEach(function() {
      conversation.port = port;
      conversation.peer.username = "lola";
    });

    it("should foward a message to the conversation", function() {
      var textMsg = new payloads.SPAChannelMessage({
        message: "yamessage",
        type: "",
        peer: "lola"
      });
      conversation.handleIncomingText(textMsg);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWithExactly(port.postEvent,
        "talkilla.spa-channel-message", {
          message: "yamessage"
        });
    });

  });

  describe("#callAccepted", function() {
    beforeEach(function() {
      conversation.port = port;
    });

    it("should post a talkilla.call-establishment message to the " +
       "conversation window", function() {
      var context = {
        peer: "nicolas",
        offer: { sdp: "fake" }
      };
      conversation.callAccepted(context);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWith(port.postEvent,
        "talkilla.call-establishment", context);
    });
  });

  describe("#hold" , function() {
    beforeEach(function() {
      conversation.port = port;
    });

    it("should post a talkilla.hold to the conversation window",
       function() {
      var holdMsg = {
        peer: "nicolas"
      };
      conversation.hold(holdMsg);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWith(port.postEvent,
        "talkilla.hold", holdMsg);
    });
  });

  describe("#resume" , function() {
    beforeEach(function() {
      conversation.port = port;
    });

    it("should post a talkilla.resume to the conversation window",
       function() {
      var resumeMsg = {
        peer: "nicolas"
      };
      conversation.resume(resumeMsg);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWith(port.postEvent,
        "talkilla.resume", resumeMsg);
    });
  });

  describe("#callHangup" , function() {
    beforeEach(function() {
      conversation.port = port;
    });

    it("should post a talkilla.call-hangup to the conversation window",
       function() {
      var context = {
        peer: "nicolas"
      };
      conversation.callHangup(context);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWith(port.postEvent,
        "talkilla.call-hangup", context);
    });
  });

  describe("#iceCandidate", function() {
    var context;

    beforeEach(function() {
      context = {
        candidate: "dummy"
      };
      conversation.port = port;
    });

    it("should post talkilla.ice-candidate to the conversation window",
      function() {
        conversation.iceCandidate(context);

        sinon.assert.calledOnce(port.postEvent);
        sinon.assert.calledWithExactly(port.postEvent,
          "talkilla.ice-candidate", context);
      });

    it("should store the ice candidate message if the port is not open",
      function() {
        conversation.port = undefined;

        conversation.iceCandidate(context);

        expect(conversation.messageQueue[0].topic)
          .to.equal("talkilla.ice-candidate");
        expect(conversation.messageQueue[0].data)
          .to.deep.equal(context);
      });
  });
});
