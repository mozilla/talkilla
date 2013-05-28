/* global app, chai, describe, it, beforeEach, afterEach, sinon,
   mozRTCPeerConnection:true, mozRTCSessionDescription:true */
var expect = chai.expect;

describe("Media", function() {
  var sandbox, success, error, callType, fakeMozRTCPeerConnection;

  function setupMainStubs() {
    // Create basic items that we'll use to form the stubs and spies
    // for each test.

    fakeMozRTCPeerConnection = {
      addStream: sandbox.spy(),
      close: sandbox.spy(),
      createOffer: sandbox.stub().callsArgWith(0, {}),
      createAnswer: sandbox.stub().callsArgWith(0, {}),
      createDataChannel: sandbox.stub().returns({}),
      setLocalDescription: sandbox.stub().callsArgWith(1, {}),
      setRemoteDescription: sandbox.stub().callsArgWith(1, {})
    };

    success = sandbox.spy();
    error = sandbox.spy();

    navigator.mozGetUserMedia = sandbox.stub().callsArgWith(1, {});
    mozRTCPeerConnection = sandbox.stub().returns(fakeMozRTCPeerConnection);
    mozRTCSessionDescription = sandbox.stub().returns({});

    app.port.initiateCall = sandbox.spy();
    app.port.acceptCall = sandbox.spy();
    app.trigger = sandbox.spy();
  }

  describe("#startCall", function() {
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

      it("should call getUserMedia with both audio and video true if both " +
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

      it("should trigger add_local_stream if media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(app.trigger);
          app.trigger.calledWith("add_local_stream");
        });

      it("should call createOffer if media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.createOffer);
        });

      it("should call setLocalDescription if media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.setLocalDescription);
        });

      it("should get a peer connection if the media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(mozRTCPeerConnection);
        });

      it("should add the stream to the peer connection if media use was " +
        "granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.addStream);
        });

      it("should initiate signalling if media use was granted", function() {
        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.calledOnce(app.port.initiateCall);
        app.port.initiateCall.calledWith("dan", {});
      });

      it("should call the success callback if media use was granted",
        function() {
          app.media.startCall("dan", null, callType, success, error);

          sinon.assert.calledOnce(success);
          sinon.assert.notCalled(error);
        });

      it("should call createAnswer if an existing offer was provided",
        function() {
          app.media.startCall("florian", "sdp", callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.createAnswer);
        });

      it("should call setLocalDescription if an existing offer was provided",
        function() {
          app.media.startCall("florian", "sdp", callType, success, error);

          sinon.assert.calledOnce(fakeMozRTCPeerConnection.setLocalDescription);
        });

      it("should accept signalling if an existing offer was provided",
        function() {
          app.media.startCall("florian", "sdp", callType, success, error);

          sinon.assert.calledOnce(app.port.acceptCall);
          app.port.initiateCall.calledWith("dan", {});
        });

      it("should call the success callback if an existing offer was provided",
        function() {
          app.media.startCall("florian", "sdp", callType, success, error);

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

      it("should get a peer connection for data calls", function() {
        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.called(mozRTCPeerConnection);
      });

      it("should not add a local stream for data calls", function() {
        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.notCalled(fakeMozRTCPeerConnection.addStream);
      });

      it("should call createDataChannel for data calls", function() {
        app.media.startCall("dan", null, callType, success, error);

        sinon.assert.called(fakeMozRTCPeerConnection.createDataChannel);
      });

      it("should trigger add_data_channel for data calls", function() {
        app.media.startCall("dan", null, callType, success, error);
        fakeMozRTCPeerConnection.ondatachannel({chan: {} });

        sinon.assert.calledOnce(app.trigger);
        app.trigger.calledWith("add_data_channel");
      });
    });
  });

  describe("#addAnswerToPeerConnection", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      setupMainStubs();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should add a sdp answer to the peer connection", function() {
      app.media.addAnswerToPeerConnection(fakeMozRTCPeerConnection, "sdp",
                                          success, error);

      sinon.assert.calledOnce(fakeMozRTCPeerConnection.setRemoteDescription);
      sinon.assert.calledOnce(success);
      sinon.assert.notCalled(error);
    });

    it("should call the error callback if there is a problem adding the " +
       "sdp to the peer connection", function() {

      fakeMozRTCPeerConnection.setRemoteDescription =
        sandbox.stub().callsArgWith(2, "error");

      app.media.addAnswerToPeerConnection(fakeMozRTCPeerConnection, "sdp",
                                          success, error);

      sinon.assert.calledOnce(fakeMozRTCPeerConnection.setRemoteDescription);
      sinon.assert.notCalled(success);
      sinon.assert.calledOnce(error);
    });
  });

  describe("#closePeerConnection", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      setupMainStubs();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should close the peer connection", function () {
      app.media.closePeerConnection(fakeMozRTCPeerConnection);

      sinon.assert.calledOnce(fakeMozRTCPeerConnection.close);
    });
  });
});
