/* global Talkilla */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  app.media.startPeerConnection = function(callee, offer, localVideo,
                                           remoteVideo, successCallback,
                                           errorCallback) {
    // First of all, see if the user wants to let us use their media
    getMedia(
      localVideo,

      function (localVideo, localStream) {
        // They do, so setup the peer connection
        var pc = getPeerConnection(localStream, remoteVideo);

        if (!offer)
          initiatePeerConnection(pc, callee, localVideo, remoteVideo,
                                 successCallback, errorCallback);
        else
          joinPeerConnection(pc, callee, offer, localVideo, remoteVideo,
                             successCallback, errorCallback);
      },

      errorCallback);
  };

  app.media.addAnswerToPeerConnection = function (pc, answer, successCallback,
                                                  errorCallback) {
    pc.setRemoteDescription(new RTCSessionDescription(answer),
                            successCallback, errorCallback);
  };

  app.media.closePeerConnection = function (pc, localVideo, remoteVideo) {
    if (localVideo && localVideo.mozSrcObject) {
      if (pc)
        pc.removeStream(localVideo.mozSrcObject);
      localVideo.mozSrcObject.stop();
      localVideo.mozSrcObject = null;
    }
    if (remoteVideo && remoteVideo.mozSrcObject) {
      remoteVideo.pause();
      remoteVideo.mozSrcObject = null;
    }
    if (pc)
      pc.close();
  };

  function initiatePeerConnection(pc, callee, localVideo, remoteVideo,
                                  successCallback, errorCallback) {
    pc.createOffer(function (offer) {
      pc.setLocalDescription(offer, function () {
        app.services.initiateCall(callee, offer);
        successCallback(pc, localVideo, remoteVideo);
      }, function (err) {
        errorCallback(err);
      });
    }, function (err) {
      errorCallback(err);
    });
  }

  function joinPeerConnection(pc, caller, offer, localVideo, remoteVideo,
                              successCallback, errorCallback) {
    pc.setRemoteDescription(new RTCSessionDescription(offer), function () {
      pc.createAnswer(function(answer) {
        pc.setLocalDescription(answer, function() {
          app.services.acceptCall(caller, answer);
          successCallback(pc, localVideo, remoteVideo);
        }, function (err) {
          errorCallback(err);
        });
      }, function (err) {
        errorCallback(err);
      });
    }, function (err) {
      errorCallback(err);
    });
  }

  function getMedia(localVideo, successCallback, errorCallback) {
    // TODO:
    // - handle asynchronicity (events?)
    navigator.mozGetUserMedia(
      {video: true, audio: true},

      function onSuccess(stream) {
        localVideo.mozSrcObject = stream;
        localVideo.play();
        // Until Chrome implements srcObject, we can't use the
        // localVideo to obtain the stream back.
        successCallback(localVideo, stream);
      },

      function onError(err) {
        errorCallback(err);
      }
    );
  }

  function getPeerConnection(localStream, remoteVideo) {
    var pc = new mozRTCPeerConnection();

    pc.addStream(localStream);

    pc.onaddstream = function (event) {
      var type = event.type;
      if (type === "video") {
        remoteVideo.mozSrcObject = event.stream;
        remoteVideo.play();
      } else {
        app.utils.log("sender onaddstream of unknown type, event = " +
                      event.toSource());
      }
    };

    return pc;
  }

})(Talkilla);
