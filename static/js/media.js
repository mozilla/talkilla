/* global Talkilla */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  /**
   * Sets up meida and then starts a peer connection for a communication.
   *
   * @param  {String}   callee      The id of the person to call
   * @param  {Object}   offer       Optional. sdp of the incoming call
   * @param  {Object}   localVideo  The localVideo element to receive
                                    the video
   * @param  {Object}   remoteVideo The remoteVideo element to
                                    display the video
   * @param  {Function} successCb   Callback(peerConnection,
   *                                         localVideo, remoteVideo)
   * @param  {Function} errorCb     Callback(error)
   */
  app.media.startPeerConnection = function(callee, offer, localVideo,
                                           remoteVideo, successCb,
                                           errorCb) {
    // First of all, see if the user wants to let us use their media
    getMedia(
      localVideo,

      function (localVideo, localStream) {
        // They do, so setup the peer connection
        var pc = getPeerConnection(localStream, remoteVideo);

        if (!offer)
          initiatePeerConnection(pc, callee, localVideo, remoteVideo,
                                 successCb, errorCb);
        else
          joinPeerConnection(pc, callee, offer, localVideo, remoteVideo,
                             successCb, errorCb);
      },

      errorCb);
  };

  /**
   * Adds an sdp answer to the peer connection.
   *
   * @param {Object}   pc        The peer connection to add the sdp to.
   * @param {Object}   answer    The answer sdp received
   * @param {Function} successCb Callback()
   * @param {Function} errorCb   Callback(err)
   */
  app.media.addAnswerToPeerConnection = function (pc, answer, successCb,
                                                  errorCb) {
    pc.setRemoteDescription(new RTCSessionDescription(answer),
                            successCb, errorCb);
  };

  /**
   * Closes a peer connection. This does everything necessary to close
   * a peer connection.
   *
   * @param {Object} pc          The peer connection to close
   * @param {Object} localVideo  The localVideo element for the pc
   * @param {Object} remoteVideo The remoteVideo element for the pc
   */
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
                                  successCb, errorCb) {
    pc.createOffer(function (offer) {
      pc.setLocalDescription(offer, function () {
        app.services.initiateCall(callee, offer);
        successCb(pc, localVideo, remoteVideo);
      }, function (err) {
        errorCb(err);
      });
    }, function (err) {
      errorCb(err);
    });
  }

  function joinPeerConnection(pc, caller, offer, localVideo, remoteVideo,
                              successCb, errorCb) {
    pc.setRemoteDescription(new RTCSessionDescription(offer), function () {
      pc.createAnswer(function(answer) {
        pc.setLocalDescription(answer, function() {
          app.services.acceptCall(caller, answer);
          successCb(pc, localVideo, remoteVideo);
        }, function (err) {
          errorCb(err);
        });
      }, function (err) {
        errorCb(err);
      });
    }, function (err) {
      errorCb(err);
    });
  }

  function getMedia(localVideo, successCb, errorCb) {
    // TODO:
    // - handle asynchronicity (events?)
    navigator.mozGetUserMedia(
      {video: true, audio: true},

      function onSuccess(stream) {
        localVideo.mozSrcObject = stream;
        localVideo.play();
        // Until Chrome implements srcObject, we can't use the
        // localVideo to obtain the stream back.
        successCb(localVideo, stream);
      },

      function onError(err) {
        errorCb(err);
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
