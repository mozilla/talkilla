/* global Talkilla, mozRTCSessionDescription, mozRTCPeerConnection */
/**
 * Media setup and handling for Talkilla
 */
(function(app) {
  "use strict";

  /**
   * Sets up media and then starts a peer connection for a communication.
   *
   * @param  {String}   callee      The id of the person to call
   * @param  {Object}   offer       Optional. sdp of the incoming call
   * @param  {Function} successCb   Callback(peerConnection)
   * @param  {Function} errorCb     Callback(error)
   */
  app.media.startPeerConnection = function(callee, offer, successCb,
                                           errorCb) {
    // First of all, see if the user wants to let us use their media
    getMedia(
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
   * @param {Object}   answer    The answer sdp received
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
        app.port.initiateCall(callee, offer);
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
          app.port.acceptCall(caller, answer);
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

  function getMedia(successCb, errorCb) {
    // TODO:
    // - handle asynchronicity (events?)
    navigator.mozGetUserMedia(
      {video: true, audio: true},

      function onSuccess(stream) {
        app.trigger("add_local_stream", stream);
        successCb(stream);
      },

      function onError(err) {
        errorCb(err);
      }
    );
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
