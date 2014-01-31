/* jshint unused:false */
/* global Conversation*/

/**
 * Conversations data storage.
 *
 * This is designed to contain list of conversation objects
 */
var ConversationList = (function() {
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

    // Object that holds the conversations.
    this.conversationList = {};
    // The queue holds a list of peer ids for whom the conversation window
    // open has been requested, but hasn't completed yet.
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
        user: this.user
      }));

      browserPort.postEvent('social.request-chat',
                            'chat.html#'+peer);
    },

    /**
     * Handle event when a new chat window is ready.
     * @param {Object} Message from a new window event
     */
    windowReady: function(readyData) {
      var pendingPeer = this.queue.pop();
      if (pendingPeer)
        this.conversationList[pendingPeer].windowOpened(readyData);
    },

    /**
     * Handle SPA offer
     * @param {payloads.Offer} offerMsg Details of the call offer
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                            social api
     */
    offer: function(offerMsg, capabilities, browserPort) {
      if (!this.has(offerMsg.peer))
        this._startConversation(offerMsg.peer, capabilities, browserPort);
      this.get(offerMsg.peer).send("talkilla.conversation-incoming", offerMsg);
    },

    /**
     * Handle SPA message
     * @param {payloads.SPAChannelMessage} spaMsg Details of the message from
     *                                            the SPA
     * @param {Array} capabilities Capabilities of the SPA
     * @param {Port} browserPort The port on which the worker talks to the
     *                           social api
     */
    message: function(textMsg, capabilities, browserPort) {
      if (!this.has(textMsg.peer))
        this._startConversation(textMsg.peer, capabilities, browserPort);
      this.get(textMsg.peer).send("talkilla.spa-channel-message", textMsg);
    },

    /**
     * Handle answer event
     * @param {payloads.Answer} answerMsg The call answer details
     */
    answer: function(answerMsg) {
      if (this.has(answerMsg.peer))
        this.get(answerMsg.peer).send('talkilla.call-establishment', answerMsg);
    },

    /**
     * handle hangup event
     * @param {payloads.Hangup} hangupMsg Call hangup details
     */
    hangup: function(hangupMsg) {
      if (this.has(hangupMsg.peer))
        this.get(hangupMsg.peer).send('talkilla.call-hangup', hangupMsg);
    },

    /**
     * handle iceCandidate event
     * @param {payloads.IceCandidate} iceCandidateMsg Ice candidate details
     */
    iceCandidate: function(iceCandidateMsg) {
      if (this.has(iceCandidateMsg.peer))
        this.get(iceCandidateMsg.peer).send('talkilla.ice-candidate',
          iceCandidateMsg);
    },

    /**
     * handle hold event
     * @param {payloads.Hold} holdMsg Hold Message details
     */
    hold: function(holdMsg) {
      if (this.has(holdMsg.peer))
        this.get(holdMsg.peer).send('talkilla.hold', holdMsg);
    },

    /**
     * handle resume event
     * @param {payloads.Resume} resumeMsg Resume Message details
     */
    resume: function(resumeMsg) {
      if (this.has(resumeMsg.peer))
        this.get(resumeMsg.peer).send('talkilla.resume', resumeMsg);
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
      this.get(instantShareMsg.peer).send('talkilla.start-call');
    }

  };

  return ConversationList;
})();
