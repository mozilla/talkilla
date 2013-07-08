/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var callData = {peer: "bob"};
  var incomingCallData = {
    peer: "alice",
    offer: {type: "answer", sdp: "fake"}
  };
  var chunk;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    app.port = {postEvent: sinon.spy()};
    _.extend(app.port, Backbone.Events);
    sandbox.stub(window, "addEventListener");
    sandbox.stub(window, "Audio").returns({
      play: sandbox.stub(),
      pause: sandbox.stub()
    });
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");

    // This stops us changing the document's title unnecessarily
    sandbox.stub(app.views.ConversationView.prototype, "initialize");

    chunk = new ArrayBuffer(22*2);
    var view = new Uint16Array(chunk);
    for (var i=0; i < 22; i++)
      view[i] = 'data'.charCodeAt(i);
  });

  afterEach(function() {
    app.port.off();
    sandbox.restore();
    chatApp = null;
  });

  function assertEventTriggersHandler(event, handler, data) {
    "use strict";

    // need to stub the prototype so that the stub happens before
    // the constructor bind()s the method
    sandbox.stub(ChatApp.prototype, handler);
    chatApp = new ChatApp();

    chatApp.port.trigger(event, data);

    sinon.assert.calledOnce(chatApp[handler]);
    sinon.assert.calledWithExactly(chatApp[handler], data);
  }

  it("should attach _onConversationOpen to talkilla.conversation-open",
    function() {
      "use strict";
      assertEventTriggersHandler("talkilla.conversation-open",
        "_onConversationOpen", callData);
    });

  it("should attach _onCallEstablishment to talkilla.call-establishment",
    function() {
      assertEventTriggersHandler("talkilla.call-establishment",
        "_onCallEstablishment", incomingCallData);
    });

  it("should attach _onIncomingCall to talkilla.call-incoming", function() {
    assertEventTriggersHandler("talkilla.call-incoming",
      "_onIncomingCall", incomingCallData);
  });

  it("should attach _onCallShutdown to talkilla.call-hangup", function() {
    assertEventTriggersHandler("talkilla.call-hangup",
      "_onCallShutdown", { peer: "mark" });
  });

  function assertModelEventTriggersHandler(event, handler) {
    "use strict";

    // need to stub the prototype so that the stub happens before
    // the constructor bind()s the method
    sandbox.stub(ChatApp.prototype, handler);
    chatApp = new ChatApp();

    var offer = {
      sdp: 'sdp',
      type: 'type'
    };

    chatApp.call.trigger(event, offer);

    sinon.assert.calledOnce(chatApp[handler]);
    sinon.assert.calledWithExactly(chatApp[handler], offer);
  }

  it("should attach _onSendOffer to send-offer on the call model",
    function() {
    assertModelEventTriggersHandler("send-offer", "_onSendOffer");
  });

  it("should attach _onSendAnswer to send-answer on the webrtc model",
    function() {
    assertModelEventTriggersHandler("send-answer", "_onSendAnswer");
  });

  it("should post talkilla.chat-window-ready to the worker", function() {
      chatApp = new ChatApp();

      sinon.assert.calledOnce(app.port.postEvent);
      sinon.assert.calledWithExactly(app.port.postEvent,
        "talkilla.chat-window-ready", {});
    });

  it("should attach _onCallHangup to unload on window", function() {
    var onCallHangup;
    window.addEventListener.restore();
    sandbox.stub(window, "addEventListener", function(event, handler) {
      onCallHangup = handler;
    });
    sandbox.stub(ChatApp.prototype, "_onCallHangup");
    chatApp = new ChatApp();

    onCallHangup();

    sinon.assert.calledOnce(chatApp._onCallHangup);
    sinon.assert.calledWithExactly(chatApp._onCallHangup);
  });

  it("should initialize the callEstablishView property", function() {
    "use strict";
    sandbox.stub(app.views, "CallEstablishView");
    chatApp = new ChatApp();
    expect(chatApp.callEstablishView).
      to.be.an.instanceOf(app.views.CallEstablishView);

    sinon.assert.calledOnce(app.views.CallEstablishView);
    sinon.assert.calledWithExactly(app.views.CallEstablishView,
      { model: chatApp.call, peer: chatApp.peer, el: $("#establish") });
  });

  it("should initialize a peer model", function() {
    sandbox.stub(app.models, "User");
    chatApp = new ChatApp();

    // This currently gets called twice because of app.data.user
    sinon.assert.called(app.models.User);
  });

  describe("ChatApp (constructed)", function () {
    var callFixture;

    beforeEach(function() {
      "use strict";

      callFixture = $('<div id="call"></div>');
      $("#fixtures").append(callFixture);

      sandbox.stub(app.utils, "AudioLibrary").returns({
        play: sandbox.spy(),
        stop: sandbox.spy()
      });

      chatApp = new ChatApp();

      // Reset the postEvent spy as the ChatApp constructor already
      // triggered a talkilla.chat-window-ready event. We do not want
      // this trigger to mess with our following tests.
      app.port.postEvent.reset();
      // Some functions only test a little bit, and don't stub everything, so
      // stub mozGetUserMedia as that tends to let callbacks happen which
      // can cause unexpected sending of data to worker ports.
      sandbox.stub(navigator, "mozGetUserMedia");
    });

    afterEach(function() {
      "use strict";
      $("#fixtures").empty();
    });

    it("should have a conversation view" , function() {
      expect(chatApp.view).to.be.an.instanceOf(app.views.ConversationView);
    });

    it("should have a call model" , function() {
      expect(chatApp.call).to.be.an.instanceOf(app.models.Call);
    });

    it("should have a webrtc call model", function() {
      expect(chatApp.webrtc).to.be.an.instanceOf(app.models.WebRTCCall);
    });

    it("should have a call view attached to the 'call' element" , function() {
      expect(chatApp.callView).to.be.an.instanceOf(app.views.CallView);
      expect(chatApp.callView.el).to.equal(callFixture[0]);
    });

    describe("#_onConversationOpen", function() {

      it("should set the peer", function() {
        chatApp._onConversationOpen(callData);

        expect(chatApp.peer.get("nick")).to.equal(callData.peer);
      });
    });

    describe("#_onIncomingCall", function() {
      it("should set the peer", function() {
        chatApp._onIncomingCall(incomingCallData);

        expect(chatApp.peer.get("nick")).to.equal(incomingCallData.peer);
      });

      it("should set the call as incoming", function() {
        sandbox.stub(chatApp.call, "incoming");

        chatApp._onIncomingCall(incomingCallData);

        sinon.assert.calledOnce(chatApp.call.incoming);
        sinon.assert.calledWithExactly(chatApp.call.incoming,
         {offer: incomingCallData.offer, video: true, audio: true});
      });

      it("should play the incoming call sound", function() {
        chatApp._onIncomingCall(incomingCallData);

        sinon.assert.calledOnce(chatApp.audioLibrary.play);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.play, "incoming");
      });
    });

    describe("#_onCallAccepted", function() {

      it("should stop the incoming call sound", function() {
        chatApp._onCallAccepted();

        sinon.assert.calledOnce(chatApp.audioLibrary.stop);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.stop, "incoming");
      });
    });

    describe("#_onCallEstablishment", function() {

      it("should set the call as established", function() {
        var answer = {};
        sandbox.stub(chatApp.call, "establish");

        chatApp._onCallEstablishment(answer);

        sinon.assert.calledOnce(chatApp.call.establish);
        sinon.assert.calledWithExactly(chatApp.call.establish, answer);
      });
    });

    describe("#_onCallOfferTimout", function() {

      it("should post the `talkilla.offer-timeout` event to the worker",
        function() {
          var callData = {foo: "bar"};

          chatApp._onCallOfferTimout(callData);

          sinon.assert.calledOnce(chatApp.port.postEvent);
          sinon.assert.calledWithExactly(chatApp.port.postEvent,
            "talkilla.offer-timeout", callData);
        });

      it("should stop outgoing call sounds", function() {
        chatApp._onCallOfferTimout({});

        sinon.assert.calledOnce(chatApp.audioLibrary.stop);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.stop, "outgoing");
      });
    });

    describe("#_onCallShutdown", function() {
      beforeEach(function() {
        sandbox.stub(chatApp.call, "hangup");
        sandbox.stub(window, "close");
        chatApp._onCallShutdown();
      });

      it("should hangup the call", function() {
        sinon.assert.calledOnce(chatApp.call.hangup);
        sinon.assert.calledWithExactly(chatApp.call.hangup);
      });

      it("should close the window", function() {
        sinon.assert.calledOnce(window.close);
        sinon.assert.calledWithExactly(window.close);
      });

      it("should stop incoming and outgoing call sounds", function() {
        sinon.assert.calledOnce(chatApp.audioLibrary.stop);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.stop,
          "incoming", "outgoing");
      });
    });

    describe("#_onCallHangup", function() {
      beforeEach(function() {
        sandbox.stub(chatApp.call, "hangup");
        chatApp.call.state.current = "ongoing";
      });

      it("should hangup the call", function() {
        chatApp._onCallHangup();
        sinon.assert.calledOnce(chatApp.call.hangup);
        sinon.assert.calledWithExactly(chatApp.call.hangup);
      });

      it("should post a talkilla.call-hangup event to the worker", function() {
        chatApp.peer.set({"nick": "florian"});
        chatApp._onCallHangup();
        sinon.assert.calledOnce(app.port.postEvent);
        sinon.assert.calledWith(app.port.postEvent,
                                "talkilla.call-hangup", {peer: "florian"});
      });

      it("should do nothing if the call is already terminated", function () {
        chatApp.call.state.current = "terminated";

        chatApp._onCallHangup();

        sinon.assert.notCalled(chatApp.call.hangup);
        sinon.assert.notCalled(app.port.postEvent);
      });

      it("should do nothing if the call was not started", function () {
        chatApp.call.state.current = "ready";

        chatApp._onCallHangup();

        sinon.assert.notCalled(chatApp.call.hangup);
        sinon.assert.notCalled(app.port.postEvent);
      });
    });

    describe("#_onSendOffer", function() {
      var offer;

      beforeEach(function() {
        offer = {
          sdp: 'sdp',
          type: 'type'
        };
      });

      it("should post an event to the worker when onSendOffer is called",
        function() {
          chatApp._onSendOffer(offer);

          sinon.assert.calledOnce(app.port.postEvent);
          sinon.assert.calledWith(app.port.postEvent, "talkilla.call-offer");
        });

      it("should start the outgoing call sound", function() {
        chatApp._onSendOffer(callData);

        sinon.assert.calledOnce(chatApp.audioLibrary.play);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.play, "outgoing");
      });

    });

    describe("#_onSendAnswer", function() {
      it("should post an event to the worker when onSendAnsweris triggered",
        function() {
          var answer = {
            sdp: 'sdp',
            type: 'type'
          };

          chatApp._onSendAnswer(answer);

          sinon.assert.calledOnce(app.port.postEvent);
          sinon.assert.calledWith(app.port.postEvent, "talkilla.call-answer");
        });
    });

    describe("#_onDataChannelMessageIn", function() {

      it("should append received message to the current text chat", function() {
        sandbox.stub(app.models.TextChat.prototype, "add");
        var newTextChat = sandbox.stub(app.models, "TextChatEntry");
        var event = {type: "chat:message", message: "data"};
        chatApp = new ChatApp();

        chatApp._onDataChannelMessageIn(event);

        sinon.assert.calledOnce(newTextChat);
        sinon.assert.calledWithExactly(newTextChat, "data");
      });

      it("should display a new file transfer to the current text chat",
        function() {
          sandbox.stub(app.models.TextChat.prototype, "add");
          var newFileTransfer = sandbox.stub(app.models, "FileTransfer");
          var event = {type: "file:new", message: "data"};
          chatApp = new ChatApp();

          chatApp._onDataChannelMessageIn(event);

          sinon.assert.calledOnce(newFileTransfer);
          sinon.assert.calledWithExactly(newFileTransfer, "data");
        });

      it("should append data to a previous started file transfer", function() {
        sandbox.stub(app.views, "TextChatView");
        var transfer = new app.models.FileTransfer({filename: "foo", size: 10});
        var event =
          {type: "file:chunk", message: {id: transfer.id, chunk: chunk}};
        sandbox.stub(transfer, "append");
        chatApp = new ChatApp();
        chatApp.textChat.add(transfer);

        chatApp._onDataChannelMessageIn(event);
        sinon.assert.calledOnce(transfer.append);
        sinon.assert.calledWithExactly(transfer.append, chunk);
      });
    });

    describe("#_onTextChatEntryCreated", function() {
      it("should send data over data channel", function() {
        var stub = sandbox.stub(app.models.WebRTCCall.prototype, "send");
        var entry = new app.models.TextChatEntry({nick: "foo", message: "bar"});
        var message = {type: "chat:message", message: entry.toJSON()};
        chatApp = new ChatApp();
        app.data.user.set("nick", "foo");

        chatApp._onTextChatEntryCreated(entry);

        sinon.assert.calledOnce(stub);
        sinon.assert.calledWithExactly(stub, message);
      });
    });

    describe("#_onFileTransferCreated", function() {
      var blob;

      beforeEach(function() {
        blob = new Blob(["abcdefghij"]);
        blob.name = "foo";
      });

      it("should notify of a new file via data channel", function() {
        var dcSend = sandbox.stub(app.models.WebRTCCall.prototype, "send");
        var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
        var message = {type: "file:new", message: {id: entry.id,
                                                   filename: "foo",
                                                   size: 10}};
        chatApp = new ChatApp();
        chatApp._onFileTransferCreated(entry);

        sinon.assert.calledOnce(dcSend);
        sinon.assert.calledWithExactly(dcSend, message);
      });

      it("should bind _onFileChunk on the chunk event triggered by the entry",
        function() {
          sandbox.stub(ChatApp.prototype, "_onFileChunk");
          sandbox.stub(app.models.WebRTCCall.prototype, "send");
          var entry = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
          sandbox.stub(entry, "off");
          chatApp = new ChatApp();
          chatApp._onFileTransferCreated(entry);

          entry.trigger("chunk", "chunk");

          sinon.assert.calledOnce(chatApp._onFileChunk);
          sinon.assert.calledWithExactly(chatApp._onFileChunk, "chunk");

          entry.trigger("complete");

          sinon.assert.calledOnce(entry.off);
          sinon.assert.calledWith(chatApp._onFileChunk, "chunk");
        });

      it("should not send anything if the entry is not a FileTransfer",
        function() {
          var dcSend = sandbox.stub(app.models.WebRTCCall.prototype, "send");
          var entry = {};
          chatApp = new ChatApp();
          chatApp._onFileTransferCreated(entry);

          sinon.assert.notCalled(dcSend);
        });
    });

    describe("#_onFileChunk", function() {

      it("should send chunks over data channel", function() {
        var dcSend = sandbox.stub(app.models.WebRTCCall.prototype, "send");
        var entry = new app.models.FileTransfer({size: 10, filename: "bar"});
        var message = {type: "file:chunk",
                       message: {id: entry.id, chunk: "chunk"}};
        chatApp = new ChatApp();

        chatApp._onFileChunk(entry.id, "chunk");

        sinon.assert.calledOnce(dcSend);
        sinon.assert.calledWithExactly(dcSend, message);
      });

    });

  });
});
