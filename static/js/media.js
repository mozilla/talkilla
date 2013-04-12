/* global Talkilla */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  app.media.initiatePeerConnection = function (callee, localVideo,
                                               successCallback,
                                               errorCallback) {
    var pc = getPeerConnection();

    function onSuccess(localVideo) {
      pc.createOffer(function (offer) {
        pc.setLocalDescription(offer, function () {
          app.services.initiateCall(callee, offer, function (err, result) {
            if (err)
              errorCallback(err, result);
            else
              successCallback(pc, localVideo);
          });
        }, function (err) {
          errorCallback(err);
        });
      }, function (err) {
        errorCallback(err);
      });
    }

    getMedia(pc, localVideo, onSuccess, errorCallback);
  };

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

  function getPeerConnection() {
    // XXX For now, use the application default ICE servers
    var pc = new window.mozRTCPeerConnection();

    // XXX add callbacks for different user stories.

    return pc;
  }

})(Talkilla);
