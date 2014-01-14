/*global expect, sinon, currentConversation:true, browserPort:true,
  Conversation, SPA, tkWorker, payloads */
/* jshint expr:true */
"use strict";

describe("Conversation", function() {
  var sandbox, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    browserPort = {
      postEvent: sandbox.spy()
    };
    sandbox.stub(window, "Worker").returns({postMessage: sinon.spy()});
    spa = new SPA({src: "example.com"});
  });

  afterEach(function() {
    browserPort = undefined;
    currentConversation = undefined;
    sandbox.restore();
  });

  describe("initialize", function() {
    it("should store the peer", function() {
      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: { username: "florian" },
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });

      expect(currentConversation.peer).to.deep.equal({username: "florian"});
    });

    it("should ask the browser to open a chat window", function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });

      sinon.assert.calledOnce(browserPort.postEvent);
      sinon.assert.calledWithExactly(browserPort.postEvent,
                                     "social.request-chat", "chat.html");
    });
  });

  describe("#windowOpened", function() {
    var port, offer, peer;

    beforeEach(function() {
      // Avoid touching the contacts db which we haven't initialized.
      sandbox.stub(tkWorker.contactsDb, "add");
      port = {
        postEvent: sandbox.spy()
      };

      offer = {
        offer: {sdp: "fake"}
      };
      tkWorker.user.name = "romain";
      tkWorker.users.set("florian", {
        username: "florian",
        presence: "connected"
      });
      peer = tkWorker.users.get("florian");
    });

    afterEach(function() {
      tkWorker.user.reset();
      tkWorker.users.reset();
      port = undefined;
    });

    it("should store the port", function() {
      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: peer,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });

      currentConversation.windowOpened(port);

      expect(currentConversation.port).to.be.equal(port);
    });

    it("should post a talkilla.conversation-open event for a " +
      "non-incoming call", function() {
        currentConversation = new Conversation({
          capabilities: spa.capabilities,
          peer: peer,
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });

        currentConversation.windowOpened(port);

        sinon.assert.calledOnce(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
          "talkilla.conversation-open", {
          capabilities: [],
          peer: peer,
          peerPresence: "connected",
          user: tkWorker.user.name
        });
      });

    it("should send peer presence information", function() {
      tkWorker.users.set("florian", { presence: "disconnected" });

      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: peer,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });

      currentConversation.windowOpened(port);

      sinon.assert.calledOnce(port.postEvent);
      sinon.assert.calledWithMatch(port.postEvent,
        "talkilla.conversation-open", {
        capabilities: [],
        peer: peer,
        peerPresence: "disconnected",
        user: tkWorker.user.name
      });
    });

    it("should send any outstanding messages when the port is opened",
      function() {
        currentConversation = new Conversation({
          capabilities: {},
          peer: spa,
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });
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

        currentConversation.messageQueue = messages;
        currentConversation.windowOpened(port);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWithExactly(currentConversation.port.postEvent,
          messages[0].topic, messages[0].data);
        sinon.assert.calledWithExactly(currentConversation.port.postEvent,
          messages[1].topic, messages[1].data);

        expect(currentConversation.messageQueue).to.deep.equal([]);
      });

  });

  describe("#handleIncomingCall", function() {
    var port, peer, offer;

    beforeEach(function() {
      // Avoid touching the contacts db which we haven't initialized.
      sandbox.stub(tkWorker.contactsDb, "add");
      tkWorker.user._name = "romain";
      port = {
        postEvent: sandbox.spy()
      };
      offer = {
        peer: "florian",
        offer: {sdp: "fake"}
      };

      tkWorker.users.set("florian", {
        username: "florian",
        presence: "connected"
      });
      peer = tkWorker.users.get("florian");

      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: peer,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.windowOpened(port);
    });

    afterEach(function() {
      port = undefined;
      tkWorker.user.reset();
      currentConversation = undefined;
    });

    it("should post a talkilla.conversation-incoming event for an " +
       "incoming call", function() {
        currentConversation.handleIncomingCall(offer);

        sinon.assert.called(port.postEvent);
        sinon.assert.calledWith(port.postEvent,
          "talkilla.conversation-incoming", offer);
      });

  });

  describe("#handleIncomingText", function() {

    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: {username: "lola"},
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should foward a message to the conversation", function() {
      var textMsg = new payloads.SPAChannelMessage({
        message: "yamessage",
        peer: "lola"
      });
      currentConversation.handleIncomingText(textMsg);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWithExactly(
        currentConversation.port.postEvent,
        "talkilla.spa-channel-message", {
          message: "yamessage"
        });
    });

  });

  describe("#callAccepted", function() {
    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.call-establishment message to the " +
       "conversation window", function() {
      var context = {
        peer: "nicolas",
        offer: { sdp: "fake" }
      };
      currentConversation.callAccepted(context);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.call-establishment", context);
    });
  });

  describe("#hold" , function() {
    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.hold to the conversation window",
       function() {
      var holdMsg = {
        peer: "nicolas"
      };
      currentConversation.hold(holdMsg);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.hold", holdMsg);
    });
  });

  describe("#resume" , function() {
    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.resume to the conversation window",
       function() {
      var resumeMsg = {
        peer: "nicolas"
      };
      currentConversation.resume(resumeMsg);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.resume", resumeMsg);
    });
  });

  describe("#callHangup" , function() {
    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.call-hangup to the conversation window",
       function() {
      var context = {
        peer: "nicolas"
      };
      currentConversation.callHangup(context);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.call-hangup", context);
    });
  });

  describe("#callHangup" , function() {
    beforeEach(function() {
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post a talkilla.call-hangup to the conversation window",
       function() {
      var context = {
        peer: "nicolas"
      };
      currentConversation.callHangup(context);

      sinon.assert.calledOnce(currentConversation.port.postEvent);
      sinon.assert.calledWith(currentConversation.port.postEvent,
        "talkilla.call-hangup", context);
    });
  });

  describe("#iceCandidate", function() {
    var context;

    beforeEach(function() {
      context = {
        candidate: "dummy"
      };
      currentConversation = new Conversation({
        capabilities: {},
        peer: spa,
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      currentConversation.port = {
        postEvent: sandbox.spy()
      };
    });

    it("should post talkilla.ice-candidate to the conversation window",
      function() {
        currentConversation.iceCandidate(context);

        sinon.assert.calledOnce(currentConversation.port.postEvent);
        sinon.assert.calledWithExactly(currentConversation.port.postEvent,
          "talkilla.ice-candidate", context);
      });

    it("should store the ice candidate message if the port is not open",
      function() {
        currentConversation.port = undefined;

        currentConversation.iceCandidate(context);

        expect(currentConversation.messageQueue[0].topic)
          .to.equal("talkilla.ice-candidate");
        expect(currentConversation.messageQueue[0].data)
          .to.deep.equal(context);
      });
  });
});
