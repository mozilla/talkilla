/* global app, chai, describe, it, sinon, beforeEach, afterEach, WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe('Text chat models', function() {
  "use strict";

  var sandbox, media, user, peer, createTextChat;

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
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();

      expect(entry.get("nick")).to.be.a("undefined");
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

    describe("#send", function() {
      var textChat;

      beforeEach(function() {
        sandbox.stub(WebRTC.prototype, "send");
        sandbox.stub(WebRTC.prototype, "initiate");

        textChat = createTextChat();
      });

      it("should send a message over a connected data channel", function() {
        var entry = {nick: "niko", message: "hi"};

        textChat.media.state.current = "ongoing";
        textChat.send(entry);

        sinon.assert.calledOnce(media.send);
        sinon.assert.calledWithExactly(media.send, entry);
      });

      it("should not initiate a peer connection if one's pending", function() {
        textChat.media.state.current = "pending";

        textChat.send({});

        sinon.assert.notCalled(media.initiate);
      });

      it("should initiate a peer connection if none's ongoing", function() {
        textChat.send({});

        sinon.assert.calledOnce(media.initiate);
      });

      it("should buffer a message then send it over data channel once a " +
         "peer connection is established", function() {
        var entry = {nick: "niko", message: "hi"};

        textChat.send(entry);
        textChat.media.trigger("dc:ready"); // dc establishment event

        sinon.assert.calledOnce(media.send);
      });
    });

  });

  describe("#_onDcMessageIn", function() {
    var textChat;

    beforeEach(function() {
      textChat = createTextChat();
    });

    it("should append received message to the current text chat", function() {
      sandbox.stub(app.models.TextChat.prototype, "add");
      var newTextChat = sandbox.stub(app.models, "TextChatEntry");
      var event = {type: "chat:message", message: "data"};

      textChat._onDcMessageIn(event);

      sinon.assert.calledOnce(newTextChat);
      sinon.assert.calledWithExactly(newTextChat, "data");
    });

    it("should append a new file transfer to the current text chat",
      function() {
        sandbox.stub(app.models.TextChat.prototype, "add");
        var newFileTransfer = sandbox.stub(app.models, "FileTransfer");
        var event = {type: "file:new", message: "data"};

        textChat._onDcMessageIn(event);

        sinon.assert.calledOnce(newFileTransfer);
        sinon.assert.calledWithExactly(newFileTransfer, "data");
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

      textChat._onDcMessageIn(event);
      sinon.assert.calledOnce(transfer.append);
      sinon.assert.calledWithExactly(transfer.append, chunk);
    });
  });

  describe("#_onTextChatEntryCreated", function() {
    var textChat, send;

    beforeEach(function() {
      user.set("nick", "foo");
      send = sandbox.stub(app.models.TextChat.prototype, "send");
      textChat = createTextChat();
    });

    it("should send data over data channel", function() {
      var entry = new app.models.TextChatEntry({nick: "foo", message: "bar"});
      var message = {type: "chat:message", message: entry.toJSON()};

      textChat._onTextChatEntryCreated(entry);

      sinon.assert.calledOnce(textChat.send);
      sinon.assert.calledWithExactly(textChat.send, message);
    });
  });

  describe("#_onFileTransferCreated", function() {
    var textChat, blob, send;

    beforeEach(function() {
      send = sandbox.stub(app.models.TextChat.prototype, "send");
      blob = new Blob(["abcdefghij"]);
      blob.name = "foo";
      textChat = createTextChat();
    });

    it("should notify of a new file via data channel", function() {
      var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
      var message = {type: "file:new", message: {id: entry.id,
                                                 filename: "foo",
                                                 size: 10}};
      textChat._onFileTransferCreated(entry);

      sinon.assert.calledOnce(send);
      sinon.assert.calledWithExactly(send, message);
    });

    it("should bind _onFileChunk on the chunk event triggered by the entry",
      function() {
        sandbox.stub(app.models.TextChat.prototype, "_onFileChunk");
        var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
        sandbox.stub(entry, "off");
        textChat._onFileTransferCreated(entry);

        entry.trigger("chunk", "chunk");

        sinon.assert.calledOnce(textChat._onFileChunk);
        sinon.assert.calledWithExactly(textChat._onFileChunk, "chunk");

        entry.trigger("complete");

        sinon.assert.calledOnce(entry.off);
        sinon.assert.calledWith(textChat._onFileChunk, "chunk");
      });

    it("should not send anything if the entry is not a FileTransfer",
      function() {
        var send = sandbox.stub(WebRTC.prototype, "send");
        var entry = {};
        textChat._onFileTransferCreated(entry);

        sinon.assert.notCalled(send);
      });
  });

  describe("#_onFileChunk", function() {
    var textChat, send;

    beforeEach(function() {
      send = sandbox.stub(app.models.TextChat.prototype, "send");
      textChat = createTextChat();
    });

    it("should send chunks over data channel", function() {
      var entry = new app.models.FileTransfer({size: 10, filename: "bar"});
      var message = {
        type: "file:chunk",
        message: {id: entry.id, chunk: "chunk"}
      };

      textChat._onFileChunk(entry.id, "chunk");

      sinon.assert.calledOnce(send);
      sinon.assert.calledWithExactly(send, message);
    });

  });

});
