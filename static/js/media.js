/* global Talkilla, mozRTCSessionDescription, mozRTCPeerConnection */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  /**
   * This sets up the media, peer connections for a call, and then passes
   * the resulting request to the transport for signalling to the other side.
   *
   * @param  {String}   callee      The id of the person to call
   * @param  {String}   offer       Optional. sdp of the incoming call
   * @param  {Object}   callType    An object containing video, audio and data
   *                                with their values as true or false depending
   *                                on if they should be enabled for this call
   *                                or not.
   * @param  {Function} successCb   Callback(peerConnection)
   * @param  {Function} errorCb     Callback(error)
   */
  app.media.startCall = function(callee, offer, callType, successCb, errorCb) {
    // First of all, see if the user wants to let us use their media
    getMedia(callType,
      function (localStream) {
        // They do, so setup the peer connection
        var pc = getPeerConnection(localStream);

        if (!offer)
          initiatePeerConnection(pc, callee, successCb, errorCb);
        else
          joinPeerConnection(pc, callee, offer, successCb, errorCb);
      },

      errorCb);
  };

  /**
   * Adds an sdp answer to the peer connection.
   *
   * @param {Object}   pc        The peer connection to add the sdp to.
   * @param {String}   answer    The answer sdp received
   * @param {Function} successCb Callback()
   * @param {Function} errorCb   Callback(err)
   */
  app.media.addAnswerToPeerConnection = function (pc, answer, successCb,
                                                  errorCb) {
    pc.setRemoteDescription(new mozRTCSessionDescription(answer),
                            successCb, errorCb);
  };

  /**
   * Closes a peer connection. This does everything necessary to close
   * a peer connection.
   *
   * @param {Object} pc          The peer connection to close
   */
  app.media.closePeerConnection = function (pc) {
    if (pc)
      pc.close();
  };

  function initiatePeerConnection(pc, callee, successCb, errorCb) {
    pc.createOffer(function (offer) {
      pc.setLocalDescription(offer, function () {
        app.services.initiateCall(callee, offer);
        successCb(pc);
      }, function (err) {
        errorCb(err);
      });
    }, function (err) {
      errorCb(err);
    });
  }

  function joinPeerConnection(pc, caller, offer, successCb, errorCb) {
    pc.setRemoteDescription(new mozRTCSessionDescription(offer), function () {
      pc.createAnswer(function(answer) {
        pc.setLocalDescription(answer, function() {
          app.services.acceptCall(caller, answer);
          successCb(pc);
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

  function getMedia(callType, successCb, errorCb) {
    // We only need to call get user media for audio and video calls.
    if (callType.audio || callType.video) {
      navigator.mozGetUserMedia(
        callType,

        function onSuccess(stream) {
          app.trigger("add_local_stream", stream);
          successCb(stream);
        },

        function onError(err) {
          errorCb(err);
        }
      );
    }
  }

  function getPeerConnection(localStream) {
    var pc = new mozRTCPeerConnection();

    pc.addStream(localStream);

    pc.onaddstream = function (event) {
      app.trigger("add_remote_stream", event.stream);
    };

    return pc;
  }

})(Talkilla);
