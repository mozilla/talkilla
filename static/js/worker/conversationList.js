/* jshint unused:false */
/* global Conversation,tkWorker*/

/**
 * Conversations data storage.
 *
 * This is designed to contain list of conversation objects
 */
var ConversationList= (function() {
  "use strict";

  /**
   * Represents conversationlist
   */
  function ConversationList(options) {
    if (!options || !options.users)
      throw new Error("missing parameter: Users");
    this.users = options.users;

    if (!options || !options.user)
      throw new Error("missing parameter: User");
    this.user = options.user;

    // object that holds the conversations
    this.conversationList = {};
    this.queue = [];
  }

  ConversationList.prototype = {
    /**
     * Checks if a user currently has a conversation
     * @param  {String}  userId User unique identifier
     * @return {Boolean}
     */
    has: function(userId) {
      return Object.prototype.hasOwnProperty.call(this.conversationList,
                                                  userId);
    },

    /**
     * Returns conversation with a given user
     * @param  {String}  userId User unique identifier
     * @return {Object}
     */
    get: function(userId) {
      return this.conversationList[userId];
    },

    /**
     * Set conversation object
     * @param  {String}  userId User unique identifier
     * @return {boolean}
     */
    set: function(userId, conversationObj) {
      this.conversationList[userId] = conversationObj;
    },

    /**
     * Remove conversation object
     * @param  {String}  userId User unique identifier
     * @return {boolean}
     */
    unset: function(portId) {
      for (var i in this.conversationList) {
        if (this.conversationList[i].port &&
            this.conversationList[i].port.id === portId)
          delete this.conversationList[i];
      }
    },

    /**
     * Resets current conversations list
     */
    reset: function() {
      this.conversationList = {};
    },

    /**
     * Start conversation with a particular peer
     * @param {String} peer Peer unique identifier
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                           social api
     * @return {Object}
     */
    _startConversation: function(peer, capabilities, browserPort) {
      this.queue.push(peer);
      this.set(peer, new Conversation({
        capabilities: capabilities,
        peer: this.users.get(peer),
        browserPort: browserPort,
        users: this.users,
        user: this.user
      }));

      // Register new contact users
      // XXX move this out of the file later
      tkWorker.contactsDb.add({username: peer}, function(err) {
        if (err)
          tkWorker.ports.broadcastError(err);
      });
    },

    /**
     * Handle SPA offer
     * @param {String} peer Peer unique identifier
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                            social api
     */
    offer: function(offerMsg, capabilities, browserPort) {
      if (!this.has(offerMsg.peer))
        this._startConversation(offerMsg.peer, capabilities, browserPort);
      this.get(offerMsg.peer).handleIncomingCall(offerMsg);
    },

    /**
     * Handle SPA message
     * @param {String} peer Peer unique identifier
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                           social api
     */
    message: function(textMsg, capabilities, browserPort) {
      if (!this.has(textMsg.peer))
        this._startConversation(textMsg.peer, capabilities, browserPort);
      this.get(textMsg.peer).handleIncomingText(textMsg);
    },

    /**
     * Handle answer event
     * @param {Object} Message from answer event
     */
    answer: function(answerMsg) {
      if (this.has(answerMsg.peer))
        this.get(answerMsg.peer).callAccepted(answerMsg);
    },

    /**
     * handle hangup event
     * @param {Object} Message from hangup event
     */
    hangup: function(hangupMsg) {
      if (this.has(hangupMsg.peer))
        this.get(hangupMsg.peer).callHangup(hangupMsg);
    },

    /**
     * handle iceCandidate event
     * @param {Object} Message from iceCandidate event
     */
    iceCandidate: function(iceCandidateMsg) {
      if (this.has(iceCandidateMsg.peer))
        this.get(iceCandidateMsg.peer).iceCandidate(iceCandidateMsg);
    },

    /**
     * handle hold event
     * @param {Object} Message from hold event
     */
    hold: function(holdMsg) {
      if (this.has(holdMsg.peer))
        this.get(holdMsg.peer).hold(holdMsg);
    },

    /**
     * handle resume event
     * @param {Object} Message from resume event
     */
    resume: function(resumeMsg) {
      if (this.has(resumeMsg.peer))
        this.get(resumeMsg.peer).resume(resumeMsg);
    },

    /**
     * handle new conversation event
     * @param {Object} Message from new conversation event
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                           social api
     */
    conversationOpen: function(event, capabilities, browserPort) {
      if (this.has(event.data.peer))
        return;
      this._startConversation(event.data.peer, capabilities, browserPort);
    },

    /**
     * handle event when a new chat window is ready
     * @param {Object} Message from a new window event
     */
    windowReady: function(readyData) {
      var lastRequested = this.queue.pop();
      if (lastRequested)
        this.conversationList[lastRequested].windowOpened(readyData);
    },

    /**
     * handle an instantShare event
     * @param {Object} Message from a instantShare event
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                           social api
     */
    instantshare: function(instantShareMsg, capabilities, browserPort) {
      if (!this.has(instantShareMsg.peer)) {
        this._startConversation(instantShareMsg.peer, capabilities,
          browserPort);
      }
      this.get(instantShareMsg.peer).startCall();
    }

  };

  return ConversationList;
})();
