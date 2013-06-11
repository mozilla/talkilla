/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, _, Backbone */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var callData = {callee: "bob"};
  var incomingCallData = {
    caller: "alice",
    offer: {type: "answer", sdp: "fake"}
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.models.Call.prototype, "_startTimer");
    app.port = {postEvent: sinon.spy()};
    _.extend(app.port, Backbone.Events);
    sandbox.stub(window, "addEventListener");
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");

    // This stops us changing the document's title unnecessarily
    sandbox.stub(app.views.ChatView.prototype, "initialize");
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

  it("should attach _onStartingCall to talkilla.call-start", function() {
    "use strict";
    assertEventTriggersHandler("talkilla.call-start",
      "_onStartingCall", callData);
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
      "_onCallShutdown", { other: "mark" });
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


  describe("ChatApp (constructed)", function () {
    var callFixture;

    beforeEach(function() {
      "use strict";

      callFixture = $('<div id="call"></div>');
      $("#fixtures").append(callFixture);

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

    it("should have a chat view" , function() {
      expect(chatApp.view).to.be.an.instanceOf(app.views.ChatView);
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

    describe("#_onStartingCall", function() {

      it("should set the caller and callee", function() {
        chatApp._onStartingCall(callData);

        expect(chatApp.call.get('otherUser')).to.equal(callData.callee);
      });

      it("should start the call", function() {
        sandbox.stub(chatApp.call, "start");

        chatApp._onStartingCall(callData);

        sinon.assert.calledOnce(chatApp.call.start);
        sinon.assert.calledWithExactly(chatApp.call.start, callData);
      });
    });

    describe("#_onIncomingCall", function() {
      it("should set the caller and callee", function() {
        chatApp._onIncomingCall(incomingCallData);

        expect(chatApp.call.get('otherUser')).to.equal(incomingCallData.caller);
      });

      it("should set the call as incoming", function() {
        sandbox.stub(chatApp.call, "incoming");

        chatApp._onIncomingCall(incomingCallData);

        sinon.assert.calledOnce(chatApp.call.incoming);
        sinon.assert.calledWithExactly(chatApp.call.incoming, incomingCallData);
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
        chatApp.call.set("otherUser", "florian");
        chatApp._onCallHangup();
        sinon.assert.calledOnce(app.port.postEvent);
        sinon.assert.calledWith(app.port.postEvent,
                                "talkilla.call-hangup", {other: "florian"});
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
      it("should post an event to the worker when onSendOffer is called",
        function() {
          var offer = {
            sdp: 'sdp',
            type: 'type'
          };

          chatApp._onSendOffer(offer);

          sinon.assert.calledOnce(app.port.postEvent);
          sinon.assert.calledWith(app.port.postEvent, "talkilla.call-offer");
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
      it("should append received data to the current text chat", function() {
        var stub = sandbox.stub(app.models.TextChat.prototype, "add");
        chatApp = new ChatApp();
        var event = {data: JSON.stringify({foo: "bar"})};

        chatApp._onDataChannelMessageIn(event);

        sinon.assert.calledOnce(stub);
        sinon.assert.calledWithExactly(stub, {foo: "bar"});
      });
    });

    describe("#_onTextChatEntryCreated", function() {
      it("should send data over data channel", function() {
        var stub = sandbox.stub(app.models.WebRTCCall.prototype, "send");
        chatApp = new ChatApp();
        var entry = {foo: "bar"};

        chatApp._onTextChatEntryCreated(entry);

        sinon.assert.calledOnce(stub);
        sinon.assert.calledWithExactly(stub, JSON.stringify(entry));
      });
    });

  });
});
