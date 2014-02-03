/* jshint unused:false */
/**
 * Conversation data storage.
 *
 * This is designed to contain information about open conversation
 * windows, and to route appropraite information to those windows.
 *
 * Conversation will also queue messages until it is notified that
 * a window has been opened.
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

    if (!options || !options.user)
      throw new Error("missing parameter: User");
    this.user = options.user;

    this.messageQueue = [];
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

      var msg = {
        capabilities: this.capabilities,
        peer: this.peer,
        user: this.user.name
      };

      this.port.postEvent("talkilla.conversation-open", msg);

      // Now send any queued messages
      this.messageQueue.forEach(function(message) {
        this.port.postEvent(message.topic, message.data);
      }, this);

      this.messageQueue = [];
    },

    /**
    * Attempts to post a message to the port, if the port is not known
    * it will queue the message for delivery on window opened.
    *
    * @param {String} topic Topic of the message to send
    * @param {Object} data  The data to send with the message
    */
    postMessage: function(topic, data) {
      if (this.port)
        this.port.postEvent(topic, data);
      else
        this.messageQueue.push({topic: topic, data: data});
    }
  };

  return Conversation;
}());

