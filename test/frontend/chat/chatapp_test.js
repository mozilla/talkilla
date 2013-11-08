/*global app, chai, ChatApp, sinon, WebRTC, payloads */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  "use strict";

  var sandbox, chatApp, AppPortStub;
  var callData = {peer: "bob", peerPresence: "connected"};
  var incomingCallData = {
    callid: 2,
    peer: "alice",
    peerPresence: "connected",
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
    AppPortStub = _.extend({postEvent: sinon.spy()}, Backbone.Events);
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "AppPort").returns(AppPortStub);
    sandbox.stub(window, "Audio").returns({
      play: sandbox.stub(),
      pause: sandbox.stub()
    });

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
    AppPortStub.off();
    sandbox.restore();
    chatApp = null;
    app.options.DEBUG = false;
  });

  function assertEventTriggersHandler(event, handler, data) {

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

  it("should attach _onUserJoined to talkilla.user-joined", function() {
    assertEventTriggersHandler("talkilla.user-joined",
      "_onUserJoined", "harvey");
  });

  it("should attach _onUserLeft to talkilla.user-joined", function() {
    assertEventTriggersHandler("talkilla.user-left",
      "_onUserLeft", "harvey");
  });

  function assertModelEventTriggersHandler(event, handler) {
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

  it("should initialize the callEstablishView property", function() {
    sandbox.stub(app.views, "CallEstablishView");
    chatApp = new ChatApp();
    expect(chatApp.callEstablishView).
      to.be.an.instanceOf(app.views.CallEstablishView);

    sinon.assert.calledOnce(app.views.CallEstablishView);
    sinon.assert.calledWithExactly(app.views.CallEstablishView, {
      call: chatApp.call,
      peer: chatApp.peer,
      audioLibrary: chatApp.audioLibrary,
      el: $("#establish")
    });
  });

  it("should initialize a peer model", function() {
    sandbox.stub(app.models, "User").returns({on: sandbox.spy()});

    chatApp = new ChatApp();

    sinon.assert.called(app.models.User);
  });

  describe("ChatApp (constructed)", function () {
    var callFixture;

    beforeEach(function() {
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

      it("should set peer's presence", function() {
        chatApp._onConversationOpen(callData);

        expect(chatApp.peer.get("presence")).to.equal(callData.peerPresence);
      });

      it("should trigger peer's presence attribute change", function() {
        sandbox.stub(chatApp.peer, 'trigger').returns(chatApp.peer);

        chatApp._onConversationOpen(callData);

        sinon.assert.calledWith(chatApp.peer.trigger, "change:presence");
      });
    });

    describe("#_onIncomingConversation", function() {
      it("should set the peer", function() {
        chatApp._onIncomingConversation(incomingCallData);

        expect(chatApp.peer.get("nick")).to.equal(incomingCallData.peer);
      });

      it("should set peer's presence", function() {
        chatApp._onIncomingConversation(incomingCallData);

        expect(chatApp.peer.get("presence")).eql(incomingCallData.peerPresence);
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
          new app.payloads.Offer(incomingCallData));
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
    });

    describe("#_onCallShutdown", function() {
      var hangupData;

      beforeEach(function() {
        hangupData = new app.payloads.Hangup({
          peer: "foo",
          callid: 1
        }).toJSON();
        chatApp.call.callid = 1;

        sandbox.stub(chatApp.call, "hangup");
        sandbox.stub(window, "close");
        chatApp._onCallShutdown(hangupData);
      });

      it("should hangup the call", function() {
        sinon.assert.calledOnce(chatApp.call.hangup);
        sinon.assert.calledWithExactly(chatApp.call.hangup, false);
      });

      it("should close the window", function() {
        sinon.assert.calledOnce(window.close);
        sinon.assert.calledWithExactly(window.close);
      });

      it("should stop incoming call sounds", function() {
        sinon.assert.calledOnce(chatApp.audioLibrary.stop);
        sinon.assert.calledWithExactly(chatApp.audioLibrary.stop,
          "incoming");
      });

      it("should not hangup the call if the call id is different", function() {
        chatApp.call.hangup.reset();
        chatApp.call.callid = 2;
        chatApp._onCallShutdown(hangupData);

        sinon.assert.notCalled(chatApp.call.hangup);
      });

    });

    describe("#_onCallHangup", function() {

      it("should send a talkilla.call-hangup event", function() {
        var fakeHangupMsg = {toJSON: function() {}};
        sandbox.stub(window, "close");

        chatApp._onCallHangup(fakeHangupMsg);

        sinon.assert.called(chatApp.port.postEvent);
        sinon.assert.calledWith(chatApp.port.postEvent,
                                "talkilla.call-hangup");
        sinon.assert.called(window.close);
      });
    });

    describe("#_onSendOffer", function() {

      it("should post an event to the worker when onSendOffer is called",
        function() {
          var offerMsg = new payloads.Offer({
            offer: "fake offer",
            peer: "leila"
          });
          chatApp._onSendOffer(offerMsg);

          sinon.assert.called(chatApp.port.postEvent);
          sinon.assert.calledWith(chatApp.port.postEvent,
                                  "talkilla.call-offer");
        });
    });

    describe("#_onSendAnswer", function() {
      it("should post an event to the worker when onSendAnswer is triggered",
        function() {
          var answerMsg = new payloads.Answer({
            answer: "fake answer",
            peer: "lisa"
          });

          chatApp._onSendAnswer(answerMsg);

          sinon.assert.called(chatApp.port.postEvent);
          sinon.assert.calledWith(chatApp.port.postEvent,
                                  "talkilla.call-answer");
        });
    });

    describe("#_onSendTimeout", function() {
      it("should post a talkilla.call-hangup event to the worker", function() {
        var fakeHangupMsg = {toJSON: function() {}};

        chatApp.call.trigger("send-timeout", fakeHangupMsg);

        sinon.assert.called(chatApp.port.postEvent);
        sinon.assert.calledWith(chatApp.port.postEvent,
                                "talkilla.call-hangup");
      });
    });

    describe("#_onUserJoined", function() {
      it("should update peer's presence information when joining", function() {
        chatApp.peer.set({nick: "niko", presence: "disconnected"});

        chatApp._onUserJoined("niko");

        expect(chatApp.peer.get("presence")).eql("connected");
      });
    });

    describe("#_onUserLeft", function() {
      it("should update peer's presence information when leaving", function() {
        chatApp.peer.set({nick: "niko", presence: "connected"});

        chatApp._onUserLeft("niko");

        expect(chatApp.peer.get("presence")).eql("disconnected");
      });
    });

    describe("Events", function() {
      describe("ice:candidate-ready", function() {
        it("should post a talkilla:ice-candidate message to the worker",
          function() {
          var iceCandidateMsg = new payloads.IceCandidate({
            peer: "lloyd",
            candidate: "dummy"
          });
          chatApp.peer.set("nick", "lloyd");

          chatApp.webrtc.trigger("ice:candidate-ready", "dummy");

          sinon.assert.called(AppPortStub.postEvent);
          sinon.assert.calledWith(AppPortStub.postEvent,
                                  "talkilla.ice-candidate",
                                  iceCandidateMsg.toJSON());
        });
      });

      describe("talkilla.ice-candidate", function () {
        it("should pass the candidate to the webrtc model", function() {
          var candidate = "dummy";

          sandbox.stub(chatApp.webrtc, "addIceCandidate");

          chatApp.port.trigger("talkilla.ice-candidate", {
            candidate: candidate
          });

          sinon.assert.calledOnce(chatApp.webrtc.addIceCandidate);
          sinon.assert.calledWith(chatApp.webrtc.addIceCandidate, candidate);
        });
      });

      describe("unload", function() {
        it("should hangup the call", function() {
          sandbox.stub(chatApp.call, "hangup");

          var unloadEvent = document.createEvent("Event");
          unloadEvent.initEvent("unload", false, false);

          window.dispatchEvent(unloadEvent);

          sinon.assert.called(chatApp.call.hangup);
          sinon.assert.calledWith(chatApp.call.hangup);
        });
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
