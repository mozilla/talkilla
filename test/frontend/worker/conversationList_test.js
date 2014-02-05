/*global chai, ConversationList, sinon, Conversation:true*/
/*global CurrentUsers */

"use strict";

var expect = chai.expect;

describe("ConversationList", function() {
  var sandbox, browserPort;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    browserPort = {
      postEvent: sandbox.spy()
    };
  });

  afterEach(function() {
    browserPort = undefined;
    sandbox.restore();
  });

  describe("#constructor", function() {
    it("should create an object", function() {
      var conversationList = new ConversationList({
        users: new CurrentUsers(),
        user: {
          name: 'dmose'
        }
      });
      expect(conversationList).to.be.an("object");
    });
  });

  describe("constructed", function() {
    var conversationList, conversation;

    beforeEach(function(){
      conversationList = new ConversationList({
        users: new CurrentUsers(),
        user: {
          name: 'dmose'
        }
      });
      conversationList.users.set("dmose", {presence: "connected"});
      // XXX We should probably be using Mocks or some other form of stubbing
      // for some of the objects here.
      conversation = new Conversation({
        capabilities: [],
        peer: { username: "dmose" },
        users: new CurrentUsers(),
        user: {
          name: "romain"
        }
      });
      conversationList.set("dmose", conversation);
    });

    afterEach(function(){
      conversationList.reset();
    });

    describe("#set", function() {
      it("should add a new conversation to the list", function() {
        conversationList.set("niko");
        expect(conversationList.has("niko")).eql(true);
      });
    });

    describe("#get", function() {
      it("should retrieve an existing conversation", function() {
        expect(conversationList.get("dmose")).eql(conversation);
      });

      it("shouldn't return a nonexistent conversation", function() {
        expect(conversationList.get("hardfire")).to.be.a("undefined");
      });
    });

    describe("#unset", function() {
      it("should unset a conversation based on port id", function() {
        conversationList.set("dmose", {port: {id: 22}});

        conversationList.unset(22);

        expect(conversationList.get("dmose")).to.be.a("undefined");
      });
    });

    describe("#_startConversation", function() {
      beforeEach(function() {
        conversationList.users.set("niko", {presence: "connected"});
      });

      it("should start a new conversation", function() {
        conversationList._startConversation("niko", {}, browserPort);

        expect(conversationList.get('niko')).to.be.an.instanceOf(Conversation);
      });

      it("should push the peer name to the queue", function() {
        conversationList._startConversation("niko", {}, browserPort);

        expect(conversationList.queue).eql(["niko"]);
      });

      it("should ask the browser to open a chat window", function() {
        conversationList._startConversation("niko", {}, browserPort);

        sinon.assert.calledOnce(browserPort.postEvent);
        sinon.assert.calledWithExactly(browserPort.postEvent,
                                       "social.request-chat",
                                       "chat.html#niko");
      });

      it("should start a new conversation for peers that are not in the " +
        "users list", function() {
          conversationList._startConversation("andreas", {}, browserPort);
        });
    });

    describe("#offer", function() {
      it("should post a message to the conversation", function() {
        sandbox.stub(conversation, "postMessage");

        conversationList.offer({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.conversation-incoming", {peer: "dmose"}
        );
      });

      it("should start a new conversation", function() {
        conversationList.users.set("niko", {presence: "connected"});

        conversationList.offer({peer:"niko"}, {}, browserPort);

        expect(conversationList.get('niko')).to.be.an.instanceOf(Conversation);
      });
    });

    describe("#message", function() {
      it("should post a message to the conversation", function() {
        sandbox.stub(conversation, "postMessage");

        conversationList.message({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.spa-channel-message", {peer: "dmose"}
        );
      });

      it("should start a new conversation", function() {
        conversationList.users.set("niko", {presence: "connected"});

        conversationList.offer({peer:"niko"}, {}, browserPort);

        expect(conversationList.get('niko')).to.be.an.instanceOf(Conversation);
      });
    });

    describe("#answer", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.answer({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.call-establishment", {peer: "dmose"}
        );
      });

      it("shouldn't call callAccepted for non-existent conversation",
        function() {
          conversationList.answer({peer:"niko"});

          sinon.assert.notCalled(conversation.postMessage);
        });
    });

    describe("#hangup", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.hangup({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.call-hangup", {peer: "dmose"}
        );
      });

      it("shouldn't call callHangup for non-existent conversation",
        function() {
          conversationList.hangup({peer:"niko"});

          sinon.assert.notCalled(conversation.postMessage);
        });
    });

    describe("#iceCandidate", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.iceCandidate({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.ice-candidate", {peer: "dmose"}
        );
      });

      it("shouldn't call iceCandidate for non-existent conversation",
        function() {
          conversationList.iceCandidate({peer:"niko"});

          sinon.assert.notCalled(conversation.postMessage);
        });
    });

    describe("#hold", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.hold({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.hold", {peer: "dmose"}
        );
      });

      it("shouldn't call hold for non-existent conversation",
        function() {
          conversationList.hold({peer:"niko"});

          sinon.assert.notCalled(conversation.postMessage);
        });
    });

    describe("#resume", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.resume({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWithExactly(conversation.postMessage,
          "talkilla.resume", {peer: "dmose"}
        );
      });

      it("shouldn't call resume for non-existent conversation",
        function() {
          conversationList.resume({peer:"niko"});

          sinon.assert.notCalled(conversation.postMessage);
        });
    });

    describe("#conversationOpen", function() {
      beforeEach(function() {
        sandbox.stub(conversationList, "_startConversation");
      });

      it("should start a new conversation", function() {
        conversationList.conversationOpen({data:{ peer:"niko"}}, {}, {});

        sinon.assert.calledOnce(conversationList._startConversation);
      });

      it("shouldn't start new conversation for existing peers",
        function() {
          conversationList.conversationOpen({data:{ peer:"dmose"}});

          sinon.assert.notCalled(conversationList._startConversation);
        });
    });


    describe("#windowReady", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "windowOpened");
      });

      it("should notify windowReady to a conversation", function() {
        conversationList.queue.push("dmose");

        conversationList.windowReady({});

        sinon.assert.calledOnce(conversation.windowOpened);
      });

      it("should do nothing if the queue is empty",
        function() {
          conversationList.windowReady({});

          sinon.assert.notCalled(conversation.windowOpened);
        });
    });

    describe("#instantShare", function() {
      beforeEach(function() {
        sandbox.stub(conversation, "postMessage");
      });

      it("should post a message to the conversation", function() {
        conversationList.instantshare({peer:"dmose"});

        sinon.assert.calledOnce(conversation.postMessage);
        sinon.assert.calledWith(conversation.postMessage,
          "talkilla.start-call");
      });

      it("should start a new conversation", function() {
        conversationList.users.set("niko", {presence: "connected"});

        conversationList.instantshare({peer:"niko"}, {}, browserPort);

        expect(conversationList.get('niko')).to.be.an.instanceOf(Conversation);
      });
    });

  });
});
