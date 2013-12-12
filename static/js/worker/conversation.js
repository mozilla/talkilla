/* jshint unused:false */
/**
 * Conversation data storage.
 *
 * This is designed to contain information about open conversation
 * windows, and to route appropraite information to those windows,
 *
 * Some aspects of the design are more relevant to only allowing
 * a single conversation window, and these will need to be changed
 * at the appropriate time.
 */

var Conversation = (function() {
  "use strict";

  /**
   * Conversation object constructor
   * @param {Object} options Conversation options
   */
  function Conversation(options) {
    if (!options || !options.capabilities)
      throw new Error("missing parameter: capabilities");
    this.capabilities = options.capabilities;

    if (!options || !options.peer)
      throw new Error("missing parameter: peer");
    this.peer = options.peer;

    if (!options || !options.browserPort)
      throw new Error("missing parameter: browserPort");
    this.browserPort = options.browserPort;

    if (!options || !options.users)
      throw new Error("missing parameter: Users");
    this.users = options.users;

    if (!options || !options.user)
      throw new Error("missing parameter: User");
    this.user = options.user;

    // offer and messageQueue are temporary stores
    // until the window has been opened.
    this.offer = options.offer;
    this.messageQueue = [];

    this.browserPort.postEvent('social.request-chat', 'chat.html');
  }

  Conversation.prototype = {
    /**
    * Call to tell the conversation that a window has been opened
    * for it, so it can set the window up with the required info.
    *
    * @param {AbstractPort}  port  The Port instance associated with the window
    */
    windowOpened: function(port) {
      this.port = port;

      // XXX: remove the need for this.users after we have a user object
      var msg = {
        capabilities: this.capabilities,
        peer: this.peer,
        peerPresence: this.users.getPresence(this.peer.username),
        user: this.user.name
      };

      if (this.offer) {
        // We don't want to send a duplicate incoming message if one has
        // already been queued.
        var msgQueued = this.messageQueue.some(function(message) {
          return message.topic === "talkilla.conversation-incoming";
        });

        if (!msgQueued) {
          msg.offer = this.offer;
          this.port.postEvent("talkilla.conversation-incoming", msg);
        }
      }
      else
        this.port.postEvent("talkilla.conversation-open", msg);

      // Now send any queued messages
      this.messageQueue.forEach(function(message) {
        this.port.postEvent(message.topic, message.data);
      }, this);

      this.messageQueue = [];
    },

    /**
    * Returns true if this conversation window is for the specified
    * peer and the incoming call data is passed to that window.
    *
    * @param {payloads.offer} offer: the offer message for an
    *                                incoming conversation
    */
    handleIncomingCall: function(offer) {
      if (this.peer.username !== offer.peer)
        return false;

      this._sendMessage("talkilla.conversation-incoming", {
        capabilities: this.capabilities,
        peer: this.peer,
        peerPresence: this.users.getPresence(this.peer.username),
        offer: offer,
        user: this.user.name
      });

      return true;
    },

    /**
    * Attempts to send a message to the port, if the port is not known
    * it will queue the message for delivery on window opened.
    */
    _sendMessage: function(topic, data) {
      if (this.port)
        this.port.postEvent(topic, data);
      else
        this.messageQueue.push({topic: topic, data: data});
    },

    /**
    * Call to tell the conversation that the call has been accepted
    * by the peer.
    *
    * @param data The data associated with the call. Consisting of:
    *
    * - peer   the id of the other user
    * - offer  the sdp offer for the connection
    */
    callAccepted: function(data) {
      this.port.postEvent('talkilla.call-establishment', data);
    },

    /**
    * Call to tell the conversation window that the call has been
    * put on hold by the peer
    *
    * @param {payloads.Hold} The hold message for the conversation
    */
    hold: function(data) {
      this.port.postEvent('talkilla.hold', data);
    },


    /**
    * Call to tell the conversation window that the call has been
    * resumed by the peer.
    *
    * @param {payloads.Resume} The resume message for the conversation
    */
    resume: function(data) {
      this.port.postEvent('talkilla.resume', data);
    },


    /**
    * Call to tell the conversation window that the call has been
    * hungup by the peer.
    *
    * @param data The data associated with the call. Consisting of:
    *
    * - peer   the id of the other user
    */
    callHangup: function(data) {
      this.port.postEvent('talkilla.call-hangup', data);
    },

    iceCandidate: function(data) {
      this._sendMessage('talkilla.ice-candidate', data);
    }
  };

  return Conversation;
}());

