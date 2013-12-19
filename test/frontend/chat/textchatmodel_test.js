/*global app, chai, sinon, WebRTC */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe('Text chat models', function() {
  var sandbox, media, user, peer, createTextChat, transport;

  function fakeSDP(str) {
    return {
      str: str,
      contains: function(what) {
        return this.str.indexOf(what) !== -1;
      }
    };
  }

  var fakeOffer = {type: "offer", sdp: fakeSDP("\nm=video aaa\nm=audio bbb")};
  var fakeAnswer = {type: "answer", sdp: fakeSDP("\nm=video ccc\nm=audio ddd")};
  var fakeDataChannel = {fakeDataChannel: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozRTCPeerConnection stub
    sandbox.stub(window, "mozRTCPeerConnection").returns({
      close: sandbox.spy(),
      addStream: sandbox.spy(),
      createAnswer: function(success) {
        success(fakeAnswer);
      },
      createOffer: function(success) {
        success(fakeOffer);
      },
      setLocalDescription: function(source, success) {
        success(source);
      },
      setRemoteDescription: function(source, success) {
        success(source);
      },
      createDataChannel: function() {
        fakeDataChannel.send = sandbox.spy();
        return fakeDataChannel;
      }
    });

    // text chat model dependencies
    media = new WebRTC();
    user = new app.models.User();
    peer = new app.models.User();

    // object creation helper
    createTextChat = function() {
      return new app.models.TextChat([], {
        media: media,
        user: user,
        peer: peer
      });
    };

    transport = {send: sinon.spy()};
    _.extend(transport, Backbone.Events);
    sandbox.stub(WebRTC.prototype, "createDataChannel").returns(transport);
  });

  afterEach(function() {
    transport.off();
    sandbox.restore();
  });

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();

      expect(entry.get("username")).to.be.a("undefined");
      expect(entry.get("message")).to.be.a("undefined");
      expect(entry.get("date")).to.be.a("number");
    });
  });

  describe("app.models.TextChat", function() {

    describe("constructor", function() {
      it("should accept a `media` option", function() {
        var textChat = createTextChat();

        expect(textChat.media).to.be.an.instanceOf(WebRTC);
      });

      it("should accept a `peer` option", function() {
        var textChat = createTextChat();

        expect(textChat.peer).to.be.an.instanceOf(app.models.User);
      });
    });

    describe("#answer", function() {
      var textChat, offer, answer;

      beforeEach(function() {
        offer = {sdp: "fake", type: "offer"};
        answer = {sdp: "fake", type: "answer"};
        textChat = createTextChat();
        textChat.transport = transport;

        sandbox.stub(media, "answer");
      });

      it("should create a data channel", function() {
        textChat.answer(offer);

        sinon.assert.calledOnce(media.createDataChannel);
      });

      it("should pass the anwser to the media", function() {
        textChat.answer(offer);

        sinon.assert.calledOnce(media.answer, offer);
      });

      it("should trigger send-answer with transport data on answer-ready",
        function(done) {
          textChat.once("send-answer", function(answerMsg) {
            expect(answerMsg.answer).to.deep.equal(answer);
            done();
          });

          textChat.answer(offer);

          media.trigger("answer-ready", answer);
        });
    });

    describe("#send", function() {
      var textChat;

      beforeEach(function() {
        sandbox.stub(WebRTC.prototype, "initiate");
        textChat = createTextChat();
        textChat.transport = transport;
      });

      it("should send a message over a connected data channel", function() {
        var entry = {username: "niko", message: "hi"};

        textChat.media.state.current = "ongoing";
        textChat.send(entry);

        sinon.assert.calledOnce(textChat.transport.send);
        sinon.assert.calledWithExactly(textChat.transport.send, entry);
      });

      it("should not initiate a peer connection if one's pending", function() {
        textChat.media.state.current = "pending";

        textChat.send({});

        sinon.assert.notCalled(media.initiate);
        sinon.assert.notCalled(media.createDataChannel);
      });

      it("should initiate a peer connection if none's ongoing", function() {
        textChat.send({});

        sinon.assert.calledOnce(media.initiate);
        sinon.assert.calledOnce(media.createDataChannel);
      });

      it("should buffer a message then send it over data channel once a " +
         "peer connection is established", function() {
        var entry = {username: "niko", message: "hi"};

        textChat.send(entry);
        textChat.transport.trigger("ready"); // dc establishment event

        sinon.assert.calledOnce(textChat.transport.send);
      });
    });

    describe("#notifyTyping", function() {
      var textChat;

      beforeEach(function() {
        sandbox.stub(WebRTC.prototype, "initiate");

        textChat = createTextChat();
        textChat.transport = transport;
      });

      it("should send typing message over connected data channel", function() {
        textChat.add({message: 'test Message'});
        textChat.media.state.current = "ongoing";
        var entry = {
          type: 'chat:typing',
          message: { username: textChat.user.get('username') }
        };

        textChat.notifyTyping();

        sinon.assert.calledOnce(textChat.transport.send);
        sinon.assert.calledWithExactly(textChat.transport.send, entry);
      });

      it("should not send typing message over uninitiated data channel",
        function() {
          textChat.add({message: 'test Message'});

          textChat.notifyTyping();

          sinon.assert.notCalled(textChat.transport.send);
        });

      it("should not send typing message if empty collection", function() {
        textChat.media.state.current = "ongoing";

        textChat.notifyTyping();

        sinon.assert.notCalled(textChat.transport.send);
      });
    });

  });

  describe("#_onMessage", function() {
    var textChat;

    beforeEach(function() {
      textChat = createTextChat();
      textChat.transport = transport;
    });

    it("should append received message to the current text chat", function() {
      sandbox.stub(app.models.TextChat.prototype, "add");
      var newTextChat = sandbox.stub(app.models, "TextChatEntry");
      var event = {type: "chat:message", message: "data"};

      textChat._onMessage(event);

      sinon.assert.calledOnce(newTextChat);
      sinon.assert.calledWithExactly(newTextChat, "data");
    });

    it("should append a new file transfer to the current text chat",
      function() {
        sandbox.stub(app.models.TextChat.prototype, "add");
        var newFileTransfer = sandbox.stub(app.models, "FileTransfer");
        var event = {type: "file:new", message: {id: "someid"}};

        textChat._onMessage(event);

        sinon.assert.calledOnce(newFileTransfer);
      });

    it("should append data to a previous started file transfer", function() {
      var transfer = new app.models.FileTransfer({filename: "foo", size: 10});
      var chunk = new ArrayBuffer(22*2);
      var event = {
        type: "file:chunk",
        message: {id: transfer.id, chunk: chunk}
      };
      sandbox.stub(transfer, "append");
      textChat.add(transfer);

      textChat._onMessage(event);

      sinon.assert.calledOnce(transfer.append);
      sinon.assert.calledWithExactly(transfer.append, chunk);
    });

    it("should respond with an ack to a received chunk", function() {
      var transfer = new app.models.FileTransfer({filename: "foo", size: 10});
      var chunk = new ArrayBuffer(22*2);
      var event = {
        type: "file:chunk",
        message: {id: transfer.id, chunk: chunk}
      };
      sandbox.stub(transfer, "append");
      sandbox.stub(textChat, "send");
      textChat.add(transfer);

      textChat._onMessage(event);

      sinon.assert.calledOnce(textChat.send);
      sinon.assert.calledWithExactly(textChat.send, {
        type: "file:ack",
        message: {id: event.message.id}
      });
    });

    it("should send a chunk when the last one was acknowledged", function() {
      var transfer = new app.models.FileTransfer({filename: "foo", size: 10});
      var event = {type: "file:ack", message: {id: transfer.id}};
      textChat.add(transfer);
      sandbox.stub(transfer, "nextChunk");

      textChat._onMessage(event);

      sinon.assert.calledOnce(transfer.nextChunk);
    });

    it("should NOT send a chunk if the transfer is done", function() {
      var transfer = new app.models.FileTransfer({filename: "foo", size: 10});
      var event = {type: "file:ack", message: {id: transfer.id}};
      textChat.add(transfer);
      sandbox.stub(transfer, "nextChunk");
      sandbox.stub(transfer, "isDone").returns(true);

      textChat._onMessage(event);

      sinon.assert.notCalled(transfer.nextChunk);
    });

    it("should trigger a `chat:type-start` event", function() {
      var event = {type: "chat:typing", message: "data"};

      sandbox.stub(textChat, "trigger");
      textChat._onMessage(event);

      sinon.assert.calledOnce(textChat.trigger);
      sinon.assert.calledWithExactly(textChat.trigger, "chat:type-start",
                                     "data");
    });

    it("should trigger a `chat:type-stop` event after 5s", function() {
      this.clock = sinon.useFakeTimers();
      var event = {type: "chat:typing", message: "data"};

      sandbox.stub(textChat,"trigger");
      textChat._onMessage(event);
      this.clock.tick(5100);

      sinon.assert.calledTwice(textChat.trigger);
      sinon.assert.calledWithExactly(textChat.trigger, "chat:type-stop");
    });

    it("should clear previous timeout and add new one", function() {
      this.clock = sinon.useFakeTimers();
      var event = {type: "chat:typing", message: "data"};

      sandbox.stub(textChat,"trigger");
      textChat._onMessage(event);
      this.clock.tick(2000);
      textChat._onMessage(event);
      this.clock.tick(10000);

      sinon.assert.calledThrice(textChat.trigger);
      sinon.assert.calledWithMatch(textChat.trigger, "chat:type-stop");
    });
  });

  describe("#_onTextChatEntryCreated", function() {
    var textChat;

    beforeEach(function() {
      user.set("username", "foo");
      sandbox.stub(app.models.TextChat.prototype, "send");
      textChat = createTextChat();
    });

    it("should send data over data channel", function() {
      var entry = new app.models.TextChatEntry({
        username: "foo",
        message: "bar"
      });
      var message = {type: "chat:message", message: entry.toJSON()};

      textChat._onTextChatEntryCreated(entry);

      sinon.assert.calledOnce(textChat.send);
      sinon.assert.calledWithExactly(textChat.send, message);
    });
  });

  describe("#_onFileTransferCreated", function() {
    var textChat, blob;

    beforeEach(function() {
      blob = new Blob(["abcdefghij"]);
      blob.name = "foo";
      textChat = createTextChat();
      textChat.transport = transport;
    });

    it("should notify of a new file via data channel", function() {
      var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
      var message = {type: "file:new", message: {id: entry.id,
                                                 filename: "foo",
                                                 size: 10}};
      sandbox.stub(textChat, "send");

      textChat._onFileTransferCreated(entry);

      sinon.assert.calledOnce(textChat.send);
      sinon.assert.calledWithExactly(textChat.send, message);
    });

    it("should bind _onFileChunk on the chunk event triggered by the entry",
      function() {
        sandbox.stub(app.models.TextChat.prototype, "_onFileChunk");
        var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
        sandbox.stub(entry, "off");
        textChat._onFileTransferCreated(entry);

        entry.trigger("chunk", "chunk");

        sinon.assert.calledOnce(textChat._onFileChunk);
        sinon.assert.calledWithExactly(textChat._onFileChunk, entry, "chunk");

        entry.trigger("complete");

        sinon.assert.calledOnce(entry.off);
        sinon.assert.calledWith(entry.off, "chunk");
      });

    it("should not send anything if the entry is not a FileTransfer",
      function() {
        var entry = {};
        sandbox.stub(textChat, "send");
        textChat._onFileTransferCreated(entry);
        sinon.assert.notCalled(textChat.send);
      });
  });

  describe("#_onFileChunk", function() {
    var textChat;

    beforeEach(function() {
      textChat = createTextChat();
    });

    it("should send chunks over data channel", function() {
      var file = {size: 10};
      var entry = new app.models.FileTransfer({file: file}, {chunkSize: 1});
      var message = {
        type: "file:chunk",
        message: {id: entry.id, chunk: "chunk"}
      };
      sandbox.stub(entry, "isDone").returns(true);
      sandbox.stub(textChat, "send");

      textChat.add(entry, {silent: true});
      textChat._onFileChunk(entry, entry.id, "chunk");

      sinon.assert.calledOnce(textChat.send);
      sinon.assert.calledWithExactly(textChat.send, message);
    });

  });

});
