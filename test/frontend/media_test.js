/* global app, chai, describe, it, beforeEach, afterEach, sinon,
   mozRTCPeerConnection:true */
var expect = chai.expect;

describe("Media", function() {
  var sandbox;

  describe("#startCall", function() {
    var success, error, callType, fakeMozRTCPeerConnection;

    function setupMainStubs() {
      // Create basic items that we'll use to form the stubs and spies
      // for each test.

      fakeMozRTCPeerConnection = {
        addStream: sandbox.spy(),
        createOffer: sandbox.stub().callsArgWith(0, {}),
        createAnswer: sandbox.stub().callsArgWith(0, {}),
        setLocalDescription: sandbox.stub().callsArgWith(1, {}),
        setRemoteDescription: sandbox.stub().callsArgWith(1, {})
      };

      success = sandbox.spy();
      error = sandbox.spy();

      navigator.mozGetUserMedia = sandbox.stub().callsArgWith(1, {});
      mozRTCPeerConnection = sandbox.stub().returns(fakeMozRTCPeerConnection);

      app.services.initiateCall = sandbox.spy();
      app.trigger = sandbox.spy();
    }

    describe("mediaChannels", function () {
      beforeEach(function() {
        sandbox = sinon.sandbox.create();

        setupMainStubs();

        callType = {
          audio: true,
          video: true,
          data: false
        };
      });

      afterEach(function() {
        sandbox.restore();
      });

      it("should call getUserMedia with audio=true if audio was requested",
        function() {
          callType.video = false;

          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(navigator.mozGetUserMedia);
          var arg = navigator.mozGetUserMedia.getCall(0).args[0];
          expect(arg).to.have.property('video', false);
          expect(arg).to.have.property('audio', true);
        });

      it("should call getUserMedia with video=true if video was requested",
        function() {
          callType.audio = false;

          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(navigator.mozGetUserMedia);
          var arg = navigator.mozGetUserMedia.getCall(0).args[0];
          expect(arg).to.have.property('video', true);
          expect(arg).to.have.property('audio', false);
        });

      it("should call getUserMedia with both audio and video true if both" +
         "were requested",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(navigator.mozGetUserMedia);
          var arg = navigator.mozGetUserMedia.getCall(0).args[0];
          expect(arg).to.have.property('video', true);
          expect(arg).to.have.property('audio', true);
        });

      it("should call the error callback if media use was denied", function() {
        navigator.mozGetUserMedia =
          sandbox.stub().callsArgWith(2, "PERMISSION_DENIED");

        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.calledOnce(error);
        sinon.assert.notCalled(success);
      });

      it("should post a local stream if media use was requested and granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(app.trigger);
        });

      it("should get a peer connection if the media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(mozRTCPeerConnection);
        });

      it("should add the stream to the peer connection if media use was" +
        "granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.addStream);
        });

      it("should initiate signalling if media use was granted", function() {
        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.calledOnce(app.services.initiateCall);
        app.services.initiateCall.calledWith("dan", {});
      });

      it("should call the success callback if media use was granted",
        function() {
          callType.audio = true;

          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(success);
          sinon.assert.notCalled(error);
        });
    });

    describe("dataChannel", function () {
      beforeEach(function() {
        sandbox = sinon.sandbox.create();

        setupMainStubs();

        callType = {
          audio: false,
          video: false,
          data: true
        };
      });

      afterEach(function() {
        sandbox.restore();
      });

      it("should not call getUserMedia if only a data channel was requested",
        function() {
          navigator.mozGetUserMedia = sandbox.spy();

          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.notCalled(navigator.mozGetUserMedia);
        });
    });
  });
});
