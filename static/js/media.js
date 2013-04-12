/* global Talkilla */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  app.media.startPeerConnection = function(callee, offer, localVideo,
                                           remoteVideo, successCallback,
                                           errorCallback) {
    var pc = getPeerConnection(remoteVideo);

    if (!offer) {
      initiatePeerConnection(pc, callee, localVideo, remoteVideo,
                             successCallback, errorCallback);
    } else {
      joinPeerConnection(pc, callee, offer, localVideo, remoteVideo,
                         successCallback, errorCallback);
    }
  };

  app.media.addAnswerToPeerConnection = function (pc, answer, successCallback,
                                                  errorCallback) {
    pc.setRemoteDescription(answer, successCallback, errorCallback);
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
    function onSuccess(localVideo) {
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

    getMedia(pc, localVideo, onSuccess, errorCallback);
  }

  function joinPeerConnection(pc, caller, offer, localVideo, remoteVideo,
                              successCallback, errorCallback) {
    function onSuccess(localVideo) {
      pc.setRemoteDescription(offer, function () {
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

    getMedia(pc, localVideo, onSuccess, errorCallback);
  }

  function getMedia(pc, localVideo, successCallback, errorCallback) {
    // TODO:
    // - handle asynchronicity (events?)
    navigator.mozGetUserMedia(
      {video: true, audio: true},

      function onSuccess(stream) {
        localVideo.mozSrcObject = stream;
        localVideo.play();
        pc.addStream(localVideo.mozSrcObject);
        successCallback(localVideo);
      },

      function onError(err) {
        errorCallback(err);
      }
    );
  }

  function getPeerConnection(remoteVideo) {
    // XXX For now, use the application default ICE servers
    var pc = new window.mozRTCPeerConnection();

    pc.onaddstream = function (obj) {
      var type = obj.type;
      if (type === "video") {
        remoteVideo.mozSrcObject = obj.stream;
        remoteVideo.play();
      } else {
        app.utils.log("sender onaddstream of unknown type, obj = " +
                      obj.toSource());
      }
    };

    return pc;
  }

})(Talkilla);
