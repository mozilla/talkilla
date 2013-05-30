/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp */
/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var fakeOffer = "fakeOffer";
  var fakeAnswer = "fakeAnswer";
  var caller = "alice";
  var callee = "bob";

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.port, "postEvent");
  });

  afterEach(function() {
    app.port.off();
    sandbox.restore();
    chatApp = null;
  });

  function assertEventTriggersHandler(event, handler) {
    "use strict";

    // need to stub the prototype so that the stub happens before
    // the constructor bind()s the method
    sandbox.stub(ChatApp.prototype, handler);
    chatApp = new ChatApp();

    chatApp.port.trigger(event, caller, callee);

    sinon.assert.calledOnce(chatApp[handler]);
    sinon.assert.calledWithExactly(chatApp[handler], caller, callee);
  }

  it("should attach _onStartingCall to talkilla.call-start", function() {
    "use strict";
    assertEventTriggersHandler("talkilla.call-start", "_onStartingCall");
  });

  it("should attach _onCallEstablishment to talkilla.call-establishment",
    function() {
      assertEventTriggersHandler("talkilla.call-establishment",
        "_onCallEstablishment");
    });

  it("should attach _onIncomingCall to talkilla.call-incoming", function() {
    assertEventTriggersHandler("talkilla.call-incoming", "_onIncomingCall");
  });

  describe("ChatApp (constructed)", function () {
    beforeEach(function() {
      "use strict";
      chatApp = new ChatApp();
    });

    it("should post talkilla.chat-window-ready to the worker",
      function() {
        sinon.assert.calledOnce(app.port.postEvent);
        sinon.assert.calledWithExactly(app.port.postEvent,
          "talkilla.chat-window-ready", {});
      });

    it("should have a call model" , function() {
      expect(chatApp.call).to.be.an.instanceOf(app.models.Call);
    });

    it("should have a webrtc call model", function() {
      expect(chatApp.webrtc).to.be.an.instanceOf(app.models.WebRTCCall);
    });

    describe("#_onStartingCall", function() {

      it("should set the caller and callee", function() {
        chatApp._onStartingCall(caller, callee);

        expect(chatApp.call.get('caller')).to.equal(caller);
        expect(chatApp.call.get('callee')).to.equal(callee);
      });

      it("should start the call", function() {
        sandbox.stub(chatApp.call, "start");

        chatApp._onStartingCall(caller, callee);

        sinon.assert.calledOnce(chatApp.call.start);
        sinon.assert.calledWithExactly(chatApp.call.start);
      });

      it("should create a webrtc offer", function() {
        sandbox.stub(chatApp.call, "set");
        sandbox.stub(chatApp.call, "start");
        sandbox.stub(chatApp.webrtc, "offer");

        chatApp._onStartingCall(caller, callee);

        sinon.assert.calledOnce(chatApp.webrtc.offer);
        sinon.assert.calledWithExactly(chatApp.webrtc.offer);
      });

    });

    describe("#_onIncomingCall", function() {
      it("should set the caller and callee", function() {
        chatApp._onIncomingCall(caller, callee, fakeOffer);

        expect(chatApp.call.get('caller')).to.equal(caller);
        expect(chatApp.call.get('callee')).to.equal(callee);
      });

      it("should set the call as incoming", function() {
        sandbox.stub(chatApp.call, "incoming");

        chatApp._onIncomingCall(caller, callee, fakeOffer);

        sinon.assert.calledOnce(chatApp.call.incoming);
        sinon.assert.calledWithExactly(chatApp.call.incoming);
      });

      it("should create a webrtc offer", function() {
        sandbox.stub(chatApp.call, "set");
        sandbox.stub(chatApp.call, "start");
        sandbox.stub(chatApp.webrtc, "answer");

        chatApp._onIncomingCall(caller, callee, fakeOffer);

        sinon.assert.calledOnce(chatApp.webrtc.answer);
        sinon.assert.calledWithExactly(chatApp.webrtc.answer, fakeOffer);
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
        sinon.assert.calledWithExactly(chatApp.webrtc.establish, fakeAnswer);
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

});

describe("WebRTCCall", function() {
  var sandbox, webrtc;
  var fakeOffer = "fakeOffer";
  var fakeAnswer = "fakeAnswer";

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    webrtc = new app.models.WebRTCCall();
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

    it("should trigger an sdp event with an offer", function(done) {
      /* jshint unused: vars */
      sandbox.stub(navigator, "mozGetUserMedia",
        function(constraints, callback, errback) {
          callback();
        });
      webrtc._createOffer = function(callback) {
        callback(fakeOffer);
      };
      webrtc.on('sdp', function(offer) {
        expect(offer).to.equal(fakeOffer);
        done();
      });

      webrtc.offer();
    });

  });

  describe("_createOffer", function() {

    it("should call createOffer and setRemoteDescription", function() {
      sandbox.stub(webrtc.pc, "createOffer", function(callback) {
        callback(fakeOffer);
      });
      sandbox.stub(webrtc.pc, "setLocalDescription");

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
      sinon.assert.calledWith(webrtc.pc.setRemoteDescription, answer);
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

    it("should trigger an sdp event with an answer", function(done) {
      /* jshint unused: vars */
      sandbox.stub(navigator, "mozGetUserMedia",
        function(constraints, callback, errback) {
          callback();
        });
      webrtc._createAnswer = function(offer, callback) {
        callback(fakeAnswer);
      };
      webrtc.on('sdp', function(answer) {
        expect(answer).to.equal(fakeAnswer);
        done();
      });

      webrtc.answer(fakeOffer);
    });

  });

  describe("_createAnswer", function() {

    it("should call createAnswer, setLocalDescription and setRemoteDescription",
      function() {
        sandbox.stub(webrtc.pc, "setRemoteDescription",
          function(offer, callback) {
            callback();
          });
        sandbox.stub(webrtc.pc, "createAnswer", function(offer, callback) {
          callback(fakeAnswer);
        });
        sandbox.stub(webrtc.pc, "setLocalDescription");

        webrtc._createAnswer(fakeOffer, function() {});

        sinon.assert.calledOnce(webrtc.pc.setRemoteDescription);
        sinon.assert.calledWith(webrtc.pc.setRemoteDescription, fakeOffer);
        sinon.assert.calledOnce(webrtc.pc.createAnswer);
        sinon.assert.calledOnce(webrtc.pc.setLocalDescription);
        sinon.assert.calledWith(webrtc.pc.setLocalDescription, fakeAnswer);
      });

  });

  describe("#_getMedia", function() {

    it("should set the localStream", function() {
      sandbox.stub(navigator, "mozGetUserMedia", function(constraints, callback, errback) {
        callback(fakeLocalStream);
      });
      var callback = sinon.spy();
      var fakeLocalStream = "fakeLocalStream";

      webrtc._getMedia(callback, function() {});

      expect(webrtc.get("localStream")).to.equal(fakeLocalStream);
      sinon.assert.calledOnce(callback);
    });
  });

  it("should set the remoteStream", function() {
    var mozPeerConnection = sandbox.stub(window, "mozRTCPeerConnection");
    var fakeRemoteStream = "fakeRemoteStream";
    var event = {stream: fakeRemoteStream};
    var pc = {};
    mozRTCPeerConnection.returns(pc);
    webrtc = new app.models.WebRTCCall();

    pc.onaddstream(event);

    expect(webrtc.get("remoteStream")).to.equal(fakeRemoteStream);
  });
});

