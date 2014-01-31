/*global expect, sinon, Conversation */
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
      user: { name: "romain" }
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

  describe("#send", function() {
    it("should post the event if the port is known", function() {
      conversation.port = port;

      conversation.send("test event", {data: "fake"});

      sinon.assert.called(port.postEvent);
      sinon.assert.calledWithExactly(port.postEvent,
        "test event", {data: "fake"});
    });

    it("should queue the event if the port is not known", function() {
      conversation.send("test event", {data: "fake"});

      expect(conversation.messageQueue)
        .to.eql([{topic: "test event", data: {data: "fake"}}]);
    });
  });
});
