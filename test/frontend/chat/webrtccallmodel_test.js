/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   mozRTCSessionDescription, mozRTCPeerConnection */

/* jshint expr:true */
var expect = chai.expect;

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

  describe("#constructor", function() {

    it("should set the remoteStream", function() {
      sandbox.stub(window, "mozRTCPeerConnection");
      var fakeRemoteStream = "fakeRemoteStream";
      var event = {stream: fakeRemoteStream};
      var fakePC = {createDataChannel: function() {}};
      mozRTCPeerConnection.returns(fakePC);
      webrtc = new app.models.WebRTCCall();

      fakePC.onaddstream(event);

      expect(webrtc.get("remoteStream")).to.equal(fakeRemoteStream);
    });

    it("should create a peer connection and configure a received data channel",
      function() {
        var fakePC = {createDataChannel: function() {}};
        var fakeChannel = {};
        sandbox.stub(window, "mozRTCPeerConnection").returns(fakePC);
        var _setupDataChannelIn = sandbox.stub(app.models.WebRTCCall.prototype,
                                               "_setupDataChannelIn");
        new app.models.WebRTCCall();

        fakePC.ondatachannel({channel: fakeChannel});

        sinon.assert.calledOnce(_setupDataChannelIn);
        sinon.assert.calledWithExactly(_setupDataChannelIn, fakeChannel);
      });

    it("should configure a received data channel then trigger the " +
       "`dc.in.open` event",
      function(done) {
        var rtcCall = new app.models.WebRTCCall();
        var fakeChannel = {};
        rtcCall.on('dc.in.open', function() {
          done();
        });

        rtcCall.pc.ondatachannel({channel: fakeChannel});

        rtcCall.dcIn.onopen();
      });

    it("should configure data channel to trigger the dc.in.close event",
      function(done) {
        var rtcCall = new app.models.WebRTCCall();
        var fakeChannel = {};
        rtcCall.on('dc.in.close', function() {
          done();
        });

        rtcCall.pc.ondatachannel({channel: fakeChannel});

        rtcCall.dcIn.onclose();
      });

    it("should configure data channel to trigger the dc.in.message event",
      function(done) {
        var rtcCall = new app.models.WebRTCCall();
        var fakeChannel = {};
        rtcCall.on('dc.in.message', function() {
          done();
        });

        rtcCall.pc.ondatachannel({channel: fakeChannel});

        rtcCall.dcIn.onmessage();
      });

    it("should configure data channel to trigger the dc.in.error event",
      function(done) {
        var rtcCall = new app.models.WebRTCCall();
        var fakeChannel = {};
        rtcCall.on('dc.in.error', function() {
          done();
        });

        rtcCall.pc.ondatachannel({channel: fakeChannel});

        rtcCall.dcIn.onerror();
      });
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

  describe('_setupDataChannelIn()', function() {

    it("should setup a data channel", function() {
      var rtcCall = new app.models.WebRTCCall();
      var fakeDC = {};

      rtcCall._setupDataChannelIn(fakeDC);

      expect(fakeDC.binaryType).to.equal('blob');
      expect(fakeDC).to.include.keys(
        ['onopen', 'onmessage', 'onerror', 'onclose']);
    });

  });

});
