/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, mozRTCSessionDescription, $, _, Backbone, mozRTCPeerConnection */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var fakeAnswer = {answer: {type: "answer", sdp: "fake"}};
  var callData = {caller: "alice", callee: "bob"};
  var incomingCallData = {
    caller: "alice",
    callee: "bob",
    offer: {type: "answer", sdp: "fake"}
  };

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    app.port = {postEvent: sinon.spy()};
    _.extend(app.port, Backbone.Events);
    sandbox.stub(window, "addEventListener");
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
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

    chatApp.webrtc.trigger(event, offer);

    sinon.assert.calledOnce(chatApp[handler]);
    sinon.assert.calledWithExactly(chatApp[handler], offer);
  }

  it("should attach _onOfferReady to offer-ready on the webrtc model",
    function() {
    assertModelEventTriggersHandler("offer-ready", "_onOfferReady");
  });

  it("should attach _onAnswerReady to answer-ready on the webrtc model",
    function() {
    assertModelEventTriggersHandler("answer-ready", "_onAnswerReady");
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

        expect(chatApp.call.get('id')).to.equal(callData.caller);
        expect(chatApp.call.get('otherUser')).to.equal(callData.callee);
      });

      it("should start the call", function() {
        sandbox.stub(chatApp.call, "start");

        chatApp._onStartingCall(callData);

        sinon.assert.calledOnce(chatApp.call.start);
        sinon.assert.calledWithExactly(chatApp.call.start);
      });

      it("should create a webrtc offer", function() {
        sandbox.stub(chatApp.call, "set");
        sandbox.stub(chatApp.call, "start");
        sandbox.stub(chatApp.webrtc, "offer");

        chatApp._onStartingCall(callData);

        sinon.assert.calledOnce(chatApp.webrtc.offer);
        sinon.assert.calledWithExactly(chatApp.webrtc.offer);
      });

    });

    describe("#_onIncomingCall", function() {
      it("should set the caller and callee", function() {
        chatApp._onIncomingCall(incomingCallData);

        expect(chatApp.call.get('otherUser')).to.equal(incomingCallData.caller);
        expect(chatApp.call.get('id')).to.equal(incomingCallData.callee);
      });

      it("should set the call as incoming", function() {
        sandbox.stub(chatApp.call, "incoming");

        chatApp._onIncomingCall(incomingCallData);

        sinon.assert.calledOnce(chatApp.call.incoming);
        sinon.assert.calledWithExactly(chatApp.call.incoming);
      });

      it("should create a webrtc offer", function() {
        sandbox.stub(chatApp.call, "set");
        sandbox.stub(chatApp.call, "start");
        sandbox.stub(chatApp.webrtc, "answer");

        chatApp._onIncomingCall(incomingCallData);

        sinon.assert.calledOnce(chatApp.webrtc.answer);
        sinon.assert.calledWithExactly(chatApp.webrtc.answer,
                                       incomingCallData.offer);
      });
    });

    describe("#_onCallEstablishment", function() {

      it("should set the call as established", function() {
        var answer = {};
        sandbox.stub(chatApp.call, "establish");
        sandbox.stub(chatApp.webrtc, "establish");

        chatApp._onCallEstablishment(answer);

        sinon.assert.calledOnce(chatApp.call.establish);
        sinon.assert.calledWithExactly(chatApp.call.establish);
      });

      it("should establish the webrtc call", function() {
        sandbox.stub(chatApp.call, "establish");
        sandbox.stub(chatApp.webrtc, "establish");

        chatApp._onCallEstablishment(fakeAnswer);

        sinon.assert.calledOnce(chatApp.webrtc.establish);
        sinon.assert.calledWithExactly(chatApp.webrtc.establish,
                                       fakeAnswer.answer);
      });

    });

    describe("#_onCallShutdown", function() {
      beforeEach(function() {
        sandbox.stub(chatApp.call, "hangup");
        sandbox.stub(chatApp.webrtc, "hangup");
        sandbox.stub(window, "close");
        chatApp._onCallShutdown();
      });

      it("should hangup the call", function() {
        sinon.assert.calledOnce(chatApp.call.hangup);
        sinon.assert.calledWithExactly(chatApp.call.hangup);
      });

      it("should hangup the webrtc connection", function() {
        sinon.assert.calledOnce(chatApp.webrtc.hangup);
        sinon.assert.calledWithExactly(chatApp.webrtc.hangup);
      });

      it("should close the window", function() {
        sinon.assert.calledOnce(window.close);
        sinon.assert.calledWithExactly(window.close);
      });
    });

    describe("#_onCallHangup", function() {
      beforeEach(function() {
        sandbox.stub(chatApp.call, "hangup");
        sandbox.stub(chatApp.webrtc, "hangup");
        chatApp.call.state.current = "ongoing";
      });

      it("should hangup the call", function() {
        chatApp._onCallHangup();
        sinon.assert.calledOnce(chatApp.call.hangup);
        sinon.assert.calledWithExactly(chatApp.call.hangup);
      });

      it("should hangup the webrtc connection", function() {
        chatApp._onCallHangup();
        sinon.assert.calledOnce(chatApp.webrtc.hangup);
        sinon.assert.calledWithExactly(chatApp.webrtc.hangup);
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
        sinon.assert.notCalled(chatApp.webrtc.hangup);
        sinon.assert.notCalled(app.port.postEvent);
      });

      it("should do nothing if the call was not started", function () {
        chatApp.call.state.current = "ready";

        chatApp._onCallHangup();

        sinon.assert.notCalled(chatApp.call.hangup);
        sinon.assert.notCalled(chatApp.webrtc.hangup);
        sinon.assert.notCalled(app.port.postEvent);
      });
    });

    describe("#_onOfferReady", function() {
      it("should post an event to the worker when offer-ready is triggered",
        function() {
          var offer = {
            sdp: 'sdp',
            type: 'type'
          };

          chatApp._onOfferReady(offer);

          sinon.assert.calledOnce(app.port.postEvent);
          sinon.assert.calledWith(app.port.postEvent, "talkilla.call-offer");
        });
    });

    describe("#_onAnswerReady", function() {
      it("should post an event to the worker when answer-ready is triggered",
        function() {
          var answer = {
            sdp: 'sdp',
            type: 'type'
          };

          chatApp._onAnswerReady(answer);

          sinon.assert.calledOnce(app.port.postEvent);
          sinon.assert.calledWith(app.port.postEvent, "talkilla.call-answer");
        });
    });
  });
});

describe("Call", function() {

  var sandbox, call;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    call = new app.models.Call();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should have a state machine", function() {
    expect(call.state).to.be.an.instanceOf(Object);
  });

  it("it should have an initial state", function() {
    expect(call.state.current).to.equal('ready');
  });

  describe("#start", function() {

    it("should change the state from ready to pending", function() {
      call.start();
      expect(call.state.current).to.equal('pending');
    });

    it("should raise an error if called twice", function() {
      call.start();
      expect(call.start).to.Throw();
    });
  });

  describe("#incoming", function() {

    it("should change the state from ready to pending", function() {
      call.incoming();
      expect(call.state.current).to.equal('pending');
    });

  });

  describe("#accept", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.accept();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#establish", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.establish();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#hangup", function() {
    it("should change the state from ready to terminated", function() {
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from pending to terminated", function() {
      call.start();
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from ongoing to terminated", function() {
      call.start();
      call.accept();
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });
  });

});

describe("WebRTCCall", function() {
  var sandbox, webrtc;
  var fakeOffer = {type: "offer", sdp: "fake"};
  var fakeAnswer = {type: "answer", sdp: "fake"};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    webrtc = new app.models.WebRTCCall();
    sandbox.stub(webrtc.pc, "addStream");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#offer", function() {

    it("should call getUserMedia", function() {
      sandbox.stub(navigator, "mozGetUserMedia");

      webrtc.set({video: true, audio: true});
      webrtc.offer();

      sinon.assert.calledOnce(navigator.mozGetUserMedia);
      sinon.assert.calledWith(navigator.mozGetUserMedia,
                              {video: true, audio: true});
    });

    it("should trigger a offer-ready event with an offer", function(done) {
      /* jshint unused: vars */
      sandbox.stub(navigator, "mozGetUserMedia",
        function(constraints, callback, errback) {
          callback();
        });
      webrtc._createOffer = function(callback) {
        callback(fakeOffer);
      };
      webrtc.on('offer-ready', function(offer) {
        expect(offer).to.equal(fakeOffer);
        done();
      });

      webrtc.offer();
    });

  });

  describe("_createOffer", function() {

    it("should note an error if audio or video types have not been set",
      function() {
        webrtc._onError = sandbox.spy();

        webrtc._createOffer(function() {});

        sinon.assert.calledOnce(webrtc._onError);
      });

    it("should call createOffer and setRemoteDescription", function() {
      sandbox.stub(webrtc.pc, "createOffer", function(callback) {
        callback(fakeOffer);
      });
      sandbox.stub(webrtc.pc, "setLocalDescription");

      webrtc.set({video: true, audio: true});
      webrtc._createOffer(function() {});

      sinon.assert.calledOnce(webrtc.pc.createOffer);
      sinon.assert.calledOnce(webrtc.pc.setLocalDescription);
      sinon.assert.calledWith(webrtc.pc.setLocalDescription, fakeOffer);
    });

  });

  describe("#establish", function() {

    it("should set the given answer as a remote description", function() {
      var answer = {};

      webrtc.pc = {setRemoteDescription: sinon.spy()};
      webrtc.establish(answer);

      sinon.assert.calledOnce(webrtc.pc.setRemoteDescription);
      sinon.assert.calledWith(webrtc.pc.setRemoteDescription,
                              new mozRTCSessionDescription(answer));
    });

  });

  describe("#hangup", function() {

    it("should close the peer connection", function() {
      webrtc.pc = {close: sinon.spy()};
      webrtc.hangup();

      sinon.assert.calledOnce(webrtc.pc.close);
    });

  });

  describe("#answer", function() {

    it("should call getUserMedia", function() {
      sandbox.stub(navigator, "mozGetUserMedia");

      webrtc.set({video: true, audio: true});
      webrtc.answer(fakeAnswer);

      sinon.assert.calledOnce(navigator.mozGetUserMedia);
      sinon.assert.calledWith(navigator.mozGetUserMedia,
                              {video: true, audio: true});
    });

    it("should trigger an answer-ready event with an answer", function(done) {
      /* jshint unused: vars */
      sandbox.stub(navigator, "mozGetUserMedia",
        function(constraints, callback, errback) {
          callback();
        });
      webrtc._createAnswer = function(offer, callback) {
        callback(fakeAnswer);
      };
      webrtc.on('answer-ready', function(answer) {
        expect(answer).to.equal(fakeAnswer);
        done();
      });

      webrtc.answer(fakeOffer);
    });

  });

  describe("_createAnswer", function() {

    it("should note an error if audio or video types have not been set",
      function() {
        webrtc._onError = sandbox.spy();

        webrtc._createAnswer(fakeOffer, function() {});

        sinon.assert.calledOnce(webrtc._onError);
      });

    it("should call createAnswer, setLocalDescription and setRemoteDescription",
      function() {
        sandbox.stub(webrtc.pc, "setRemoteDescription",
          function(offer, callback) {
            callback();
          });
        sandbox.stub(webrtc.pc, "createAnswer", function(callback) {
          callback(fakeAnswer);
        });
        sandbox.stub(webrtc.pc, "setLocalDescription");

        webrtc.set({video: true, audio: true});
        webrtc._createAnswer(fakeOffer, function() {});

        sinon.assert.calledOnce(webrtc.pc.setRemoteDescription);
        sinon.assert.calledWith(webrtc.pc.setRemoteDescription,
                                new mozRTCSessionDescription(fakeOffer));
        sinon.assert.calledOnce(webrtc.pc.createAnswer);
        sinon.assert.calledOnce(webrtc.pc.setLocalDescription);
        sinon.assert.calledWith(webrtc.pc.setLocalDescription, fakeAnswer);
      });

  });

  describe("#_getMedia", function() {
    "use strict";

    var fakeLocalStream = "fakeLocalStream";

    beforeEach(function() {
      sandbox.stub(navigator, "mozGetUserMedia",
        /* jshint unused: vars */
        function(constraints, cb, errback) {
          cb(fakeLocalStream);
        });
    });

    it("should set the localStream", function() {
      webrtc._getMedia(function() {}, function() {});

      expect(webrtc.get("localStream")).to.equal(fakeLocalStream);
    });

    it('should invoke the given callback',
      function() {
        var callback = sinon.spy();

        webrtc._getMedia(callback, function() {});

        sinon.assert.calledOnce(callback);
      });

    it("should attach the localStream to the peerConnection",
      function () {
        sandbox.stub(webrtc, "set");

        webrtc._getMedia(function callbk() {}, function errbk() {});

        sinon.assert.calledOnce(webrtc.pc.addStream);
        sinon.assert.calledWithExactly(webrtc.pc.addStream, fakeLocalStream);
      });
  });

  it("should set the remoteStream", function() {
    sandbox.stub(window, "mozRTCPeerConnection");
    var fakeRemoteStream = "fakeRemoteStream";
    var event = {stream: fakeRemoteStream};
    var pc = {};
    mozRTCPeerConnection.returns(pc);
    webrtc = new app.models.WebRTCCall();

    pc.onaddstream(event);

    expect(webrtc.get("remoteStream")).to.equal(fakeRemoteStream);
  });
});


describe("CallView", function() {
  "use strict";

  var fakeLocalStream = "fakeLocalStream";
  var fakeRemoteStream = "fakeRemoteStream";
  var el = 'fakeDom';
  var sandbox, webrtc;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    webrtc = new app.models.WebRTCCall();
  });

  afterEach(function() {
    sandbox.restore();
    webrtc = null;
    $("#fixtures").empty();
  });

  describe("#initialize", function() {

    it("should attach a given webrtc model", function() {
      var callView = new app.views.CallView({el: el, webrtc: webrtc});

      expect(callView.webrtc).to.equal(webrtc);
    });

    it("should throw an error when no webrtc model is given", function() {
      function shouldExplode() {
        new app.views.CallView({el: 'fakeDom'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: webrtc/);
    });

    it("should throw an error when no el parameter is given", function() {
      function shouldExplode() {
        new app.views.CallView({webrtc: 'fakeWebrtc'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: el/);
    });

    it("should call #_displayLocalVideo when the webrtc model sets localStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayLocalVideo");
        var callView = new app.views.CallView({el: el, webrtc: webrtc});

        webrtc.set("localStream", fakeLocalStream);

        sinon.assert.calledOnce(callView._displayLocalVideo);
      });

    it("should call #_displayRemoteVideo when webrtc model sets remoteStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayRemoteVideo");
        var callView = new app.views.CallView({el: el, webrtc: webrtc});

        webrtc.set("remoteStream", fakeRemoteStream);

        sinon.assert.calledOnce(callView._displayRemoteVideo);
      });
  });

  describe("events", function() {
    it("should call hangup() when a click event is fired on the hangup button",
      function() {
        var el = $('<div><button class="btn-hangup"/></div>');
        $("#fixtures").append(el);
        sandbox.stub(app.views.CallView.prototype, "initialize");
        sandbox.stub(app.views.CallView.prototype, "hangup");
        var callView = new app.views.CallView({el: el});

        $(el).find('button').click();
        sinon.assert.calledOnce(callView.hangup);

        $("#fixtures").empty();
      });
  });

  describe("#hangup", function() {

    it('should close the window', function() {
      var el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);
      var callView = new app.views.CallView({el: el, webrtc: webrtc});
      sandbox.stub(window, "close");

      callView.hangup();

      sinon.assert.calledOnce(window.close);
    });
  });

  describe("#_displayLocalVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, webrtc: webrtc});
      webrtc.set("localStream", fakeLocalStream, {silent: true});

      videoElement = el.find('#local-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the local stream to the local-video element",
      function() {
        callView._displayLocalVideo();

        expect(videoElement.mozSrcObject).to.equal(fakeLocalStream);
      });

    it("should call play on the local-video element",
      function() {
        callView._displayLocalVideo();

        sinon.assert.calledOnce(videoElement.play);
      });
  });

  describe("#_displayRemoteVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="remote-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, webrtc: webrtc});
      webrtc.set("remoteStream", fakeRemoteStream, {silent: true});

      videoElement = el.find('#remote-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the remote stream to the 'remove-video' element",
      function() {
        callView._displayRemoteVideo();

        expect(el.find('#remote-video')[0].mozSrcObject).
          to.equal(fakeRemoteStream);
      });

    it("should play the remote videoStream",
      function() {
        callView._displayRemoteVideo();

        sinon.assert.calledOnce(videoElement.play);
      });

  });
});
