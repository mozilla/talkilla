/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, $, AppPort, WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var callData = {peer: "bob"};
  var incomingCallData = {
    peer: "alice",
    offer: {type: "answer", sdp: "fake"}
  };

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
    sandbox.stub(AppPort.prototype, "postEvent");
    sandbox.stub(window, "addEventListener");
    sandbox.stub(window, "Audio").returns({
      play: sandbox.stub(),
      pause: sandbox.stub()
    });

    // mozSocial "mock"
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: {postMessage: sinon.spy()}
        };
      }
    };

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

    // This stops us changing the document's title unnecessarily
    sandbox.stub(app.views.ConversationView.prototype, "initialize");
  });

  afterEach(function() {
    sandbox.restore();
    chatApp = null;
    app.options.DEBUG = false;
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

  it("should attach _onIncomingConversation to talkilla.conversation-incoming",
    function() {
      assertEventTriggersHandler("talkilla.conversation-incoming",
        "_onIncomingConversation", incomingCallData);
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

      sinon.assert.calledOnce(chatApp.port.postEvent);
      sinon.assert.calledWithExactly(chatApp.port.postEvent,
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
    sandbox.stub(app.models, "User").returns({on: sandbox.spy()});

    chatApp = new ChatApp();

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

    it("should have a webrtc object", function() {
      expect(chatApp.webrtc).to.be.an.instanceOf(WebRTC);
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

    describe("#_onIncomingConversation", function() {
      it("should set the peer", function() {
        chatApp._onIncomingConversation(incomingCallData);

        expect(chatApp.peer.get("nick")).to.equal(incomingCallData.peer);
      });

      it("should not set the peer if upgrading a call", function() {
        var incomingCallDataUpgrade = {
          peer: "alice",
          upgrade: true,
          offer: {type: "answer", sdp: "fake"}
        };

        chatApp.peer.set({nick: "bob"});
        chatApp._onIncomingConversation(incomingCallDataUpgrade);

        expect(chatApp.peer.get("nick")).to.equal("bob");
      });

      it("should set the call as incoming", function() {
        sandbox.stub(chatApp.call, "incoming");

        chatApp._onIncomingConversation(incomingCallData);

        sinon.assert.calledOnce(chatApp.call.incoming);
        sinon.assert.calledWithMatch(chatApp.call.incoming,
         {offer: incomingCallData.offer, video: false, audio: false});
      });

      it("should play the incoming call sound", function() {
        chatApp._onIncomingConversation(incomingCallData);

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
      var answer;

      beforeEach(function() {
        answer = {answer: "fake"};
        sandbox.stub(chatApp.call, "establish");
      });

      it("should set the call as established", function() {
        chatApp._onCallEstablishment(answer);

        sinon.assert.calledOnce(chatApp.call.establish);
        sinon.assert.calledWithExactly(chatApp.call.establish, answer);
      });

      it("should stop the outgoing call sound", function() {
        chatApp._onCallEstablishment(answer);

        sinon.assert.calledOnce(chatApp.audioLibrary.stop);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.stop, "outgoing");
      });
    });

    describe("#_onCallOfferTimout", function() {
      it("should post the `talkilla.offer-timeout` event to the worker",
        function() {
          var callData = {foo: "bar"};

          chatApp._onCallOfferTimout(callData);

          sinon.assert.called(chatApp.port.postEvent);
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

        sinon.assert.called(chatApp.port.postEvent);
        sinon.assert.calledWith(chatApp.port.postEvent,
                                "talkilla.call-hangup", {peer: "florian"});
      });

      it("should do nothing if the call is already terminated", function () {
        chatApp.call.state.current = "terminated";

        chatApp._onCallHangup();

        sinon.assert.notCalled(chatApp.call.hangup);
      });

      it("should do nothing if the call was not started", function () {
        chatApp.call.state.current = "ready";

        chatApp._onCallHangup();

        sinon.assert.notCalled(chatApp.call.hangup);
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

          sinon.assert.called(chatApp.port.postEvent);
          sinon.assert.calledWith(chatApp.port.postEvent,
                                  "talkilla.call-offer");
        });

      it("should start the outgoing call sound", function() {
        chatApp._onSendOffer(callData);

        sinon.assert.called(chatApp.audioLibrary.play);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.play, "outgoing");
      });

    });

    describe("#_onSendAnswer", function() {
      it("should post an event to the worker when onSendAnswer is triggered",
        function() {
          var answer = {
            sdp: 'sdp',
            type: 'type'
          };

          chatApp._onSendAnswer(answer);

          sinon.assert.called(chatApp.port.postEvent);
          sinon.assert.calledWith(chatApp.port.postEvent,
                                  "talkilla.call-answer");
        });
    });

    describe("Object events listeners", function() {
      var chatApp;

      beforeEach(function () {
        sandbox.stub(WebRTC.prototype, "on");
        sandbox.stub(app.models.TextChat.prototype, "on");
        sandbox.stub(app.models.Call.prototype, "on");
      });

      describe("debugging enabled", function() {
        beforeEach(function () {
          app.options.DEBUG = true;
          chatApp = new ChatApp();
        });

        it("should listen to all Call object events when debug is enabled",
          function() {
            sinon.assert.calledWith(chatApp.call.on, "all");
          });

        it("should listen to all TextChat object events when debug is enabled",
          function() {
            sinon.assert.calledWith(chatApp.textChat.on, "all");
          });

        it("should listen to all WebRTC object events when debug is enabled",
          function() {
            sinon.assert.calledWith(chatApp.webrtc.on, "all");
          });
      });

      describe("debugging disabled", function() {
        beforeEach(function () {
          app.options.DEBUG = false;
          chatApp = new ChatApp();
        });

        it("should not listen to all Call object events when debug is disabled",
          function() {
            sinon.assert.neverCalledWith(chatApp.call.on, "all");
          });

        it("should not listen to all TextChat object events when debug is " +
           "disabled",
          function() {
            sinon.assert.neverCalledWith(chatApp.textChat.on, "all");
          });

        it("should not listen to all WebRTC object events when debug is " +
           "disabled",
          function() {
            sinon.assert.neverCalledWith(chatApp.call.on, "all");
          });
      });
    });
  });
});
