/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, mozRTCSessionDescription, $, mozRTCPeerConnection */

/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;
  var fakeOffer = {type: "offer", sdp: "fake"};
  var fakeAnswer = {type: "answer", sdp: "fake"};
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
  var fakeOffer = {type: "offer", sdp: "fake"};
  var fakeAnswer = {type: "answer", sdp: "fake"};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    webrtc = new app.models.WebRTCCall();
    sinon.stub(webrtc.pc, "addStream");
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
      sinon.assert.calledWith(webrtc.pc.setRemoteDescription,
                              new mozRTCSessionDescription(answer));
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
    sandbox.stub(navigator, "mozGetUserMedia",
      /* jshint unused: vars */
      function(constraints, cb, errback) {
        cb(fakeLocalStream);
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
  var fakeLocalStream = "fakeLocalStream";
  var fakeRemoteStream = "fakeRemoteStream";
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {

    it("should expect a webrtc model", function() {
      var webrtc = new app.models.WebRTCCall();
      var callView = new app.views.CallView({webrtc: webrtc});

      expect(callView.webrtc).to.equal(webrtc);
    });

    it("should call #_displayLocalVideo when the webrtc model sets localStream",
      function () {
        var webrtc = new app.models.WebRTCCall();
        sandbox.stub(app.views.CallView.prototype, "_displayLocalVideo");
        var callView = new app.views.CallView({webrtc: webrtc});

        webrtc.set("localStream", fakeLocalStream);

        sinon.assert.calledOnce(callView._displayLocalVideo);
      });

    it("should call #_displayRemoteVideo when webrtc model sets remoteStream",
      function () {
        var webrtc = new app.models.WebRTCCall();
        sandbox.stub(app.views.CallView.prototype, "_displayRemoteVideo");
        var callView = new app.views.CallView({webrtc: webrtc});

        webrtc.set("remoteStream", fakeRemoteStream);

        sinon.assert.calledOnce(callView._displayRemoteVideo);
      });
  });

  describe("#_displayLocalVideo", function() {

    it("should setup the local video with the local stream", function() {
      var el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);

      var webrtc = new app.models.WebRTCCall();
      var callView = new app.views.CallView({el: el, webrtc: webrtc});

      webrtc.set("localStream", fakeLocalStream, {silent: true});
      callView._displayLocalVideo();
      expect(el.find('#local-video')[0].mozSrcObject).to.equal(fakeLocalStream);
    });

  });
});
