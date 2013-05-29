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
    chatApp = new ChatApp();
  });

  afterEach(function() {
    app.port.off();
    sandbox.restore();
  });

  it("should have a call model" , function() {
    expect(chatApp.call).to.be.an.instanceOf(app.models.Call);
  });

  it("should have a webrtc call model", function() {
    expect(chatApp.webrtc).to.be.an.instanceOf(app.models.WebRTCCall);
  });

  it("should post talkilla.chat-window-ready to the worker during construction",
    function() {
      sinon.assert.calledOnce(app.port.postEvent);
      sinon.assert.calledWithExactly(app.port.postEvent,
        "talkilla.chat-window-ready", {});
    });

  it("should attach _onStartingCall to talkilla.call-start", function() {
    sandbox.stub(ChatApp.prototype, "_onStartingCall");
    chatApp = new ChatApp(); // We need the constructor to use the stub

    chatApp.port.trigger("talkilla.call-start", caller, callee);

    sinon.assert.calledOnce(chatApp._onStartingCall);
    sinon.assert.calledWithExactly(chatApp._onStartingCall, caller, callee);
  });

  it("should attach _onCallEstablishment to talkilla.call-establishment", function() {
    sandbox.stub(ChatApp.prototype, "_onCallEstablishment");
    chatApp = new ChatApp(); // We need the constructor to use the stub

    chatApp.port.trigger("talkilla.call-establishment", fakeAnswer);

    sinon.assert.calledOnce(chatApp._onCallEstablishment);
    sinon.assert.calledWithExactly(chatApp._onCallEstablishment, fakeAnswer);
  });

  it("should attach _onIncomingCall to talkilla.call-incoming", function() {
    sandbox.stub(ChatApp.prototype, "_onIncomingCall");
    chatApp = new ChatApp(); // We need the constructor to use the stub

    chatApp.port.trigger("talkilla.call-incoming", caller, callee);

    sinon.assert.calledOnce(chatApp._onIncomingCall);
    sinon.assert.calledWithExactly(chatApp._onIncomingCall, caller, callee);
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
      sandbox.stub(navigator, "mozGetUserMedia", function(constraints, callback, errback) {
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
      sandbox.stub(navigator, "mozGetUserMedia", function(constraints, callback, errback) {
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

    it("should call createAnswer, setLocalDescription and setRemoteDescription", function() {
      sandbox.stub(webrtc.pc, "setRemoteDescription", function(offer, callback) {
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
});

