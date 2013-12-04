/* global indexedDB, importScripts, SPA, HTTP, ContactsDB, SPADB,
   CurrentUsers, loadConfig, payloads  */
/* jshint unused:false */
"use strict";

// XXX: Try to import Backbone only in files that need it (and check
// if multiple imports cause problems).
importScripts('../vendor/backbone-events-standalone-0.1.5.js');
importScripts('/config.js', 'payloads.js', 'addressbook/contactsdb.js');
importScripts('spadb.js', '/js/http.js', 'worker/users.js', 'worker/spa.js');

var gConfig = loadConfig();
var browserPort;
var currentConversation;
// XXX This should definitely not be exposed globally as we'll need
// to support multiple SPAs in a near future.
var spa;
// XXX Initialised at end of file whilst we move everything
// into it.
var tkWorker;

/**
 * Conversation data storage.
 *
 * This is designed to contain information about open conversation
 * windows, and to route appropraite information to those windows,
 *
 * Some aspects of the design are more relevant to only allowing
 * a single conversation window, and these will need to be changed
 * at the appropriate time.
 *
 * @param {SPA} spa: the SPA wrapper instance.
 * @param {String} peer: the Peer for the conversation
 * @param {payloads.Offer} offer: Optional, the offer message for an
 *                                incoming conversation
 */
function Conversation(spa, peer, offer) {
  this.peer = peer;
  this.port = undefined;
  this.capabilities = spa.capabilities;

  // offer and messageQueue are temporary stores
  // until the window has been opened.
  this.offer = offer;
  this.messageQueue = [];

  browserPort.postEvent('social.request-chat', 'chat.html');
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

    // For collected contacts
    tkWorker.contactsDb.add({username: this.peer}, function(err) {
      if (err)
        tkWorker.ports.broadcastError(err);
    });

    var msg = {
      capabilities: this.capabilities,
      peer: this.peer,
      peerPresence: tkWorker.users.getPresence(this.peer),
      user: tkWorker.user.name
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
    tkWorker.ports.broadcastDebug('handle incoming call', offer);

    if (this.peer !== offer.peer)
      return false;

    this._sendMessage("talkilla.conversation-incoming", {
      capabilities: this.capabilities,
      peer: this.peer,
      peerPresence: tkWorker.users.getPresence(this.peer),
      offer: offer,
      user: tkWorker.user.name
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
    tkWorker.ports.broadcastDebug('conversation accepted', data);
    this.port.postEvent('talkilla.call-establishment', data);
  },

  /**
   * Call to tell the conversation window that the call has been
   * put on hold by the peer
   *
   * @param {payloads.Hold} The hold message for the conversation
   */
  hold: function(data) {
    tkWorker.ports.broadcastDebug('hold', data);
    this.port.postEvent('talkilla.hold', data);
  },


  /**
   * Call to tell the conversation window that the call has been
   * resumed by the peer.
   *
   * @param {payloads.Resume} The resume message for the conversation
   */
  resume: function(data) {
    tkWorker.ports.broadcastDebug('resume', data);
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
    tkWorker.ports.broadcastDebug('conversation hangup', data);
    this.port.postEvent('talkilla.call-hangup', data);
  },

  iceCandidate: function(data) {
    tkWorker.ports.broadcastDebug('ice:candidate', data);
    this._sendMessage('talkilla.ice-candidate', data);
  }
};

/**
 * User data and Social API profile data storage.
 *
 * This is designed to contain the majority of the user's status and
 * their current presence.
 *
 * When setting an attribute, it will automatically send a message to
 * the social API giving the new details.
 *
 * @param {Object|undefined}  initial  Initial data
 * @param {Object|undefined}  config   Environment configuration
 *
 * UserData properties:
 *
 * name:      The name of the currently signed-in user.
 * connected: Whether or not the user is connected.
 */
function UserData(initial, config) {
  this._rootURL = config ? config.ROOTURL : '';

  this.defaults = {
    _name: undefined,
    _connected: false
  };

  this.reset(true);

  if (initial) {
    for (var key in initial)
      this[key] = initial[key];
  }
  // We don't send the social api message here, as we should be
  // constructed before we get the port set up.
}

UserData.prototype = {

  get name() {
    return this._name;
  },

  set name(name) {
    this._name = name;
    this.send();
  },

  get connected() {
    return this._connected;
  },

  set connected(connected) {
    this._connected = connected;
    this.send();
  },

  /**
   * Resets current properties to default ones.
   * @param {Boolean} skipSend Skip sending reset notification?
   */
  reset: function(skipSend) {
    for (var key in this.defaults)
      this[key] = this.defaults[key];

    if (!skipSend)
      this.send();
  },

  /**
   * Returns the appropriate image object for our status.
   */
  get statusIcon() {
    // If we're not connected, then always show the standard
    // icon, regardless of the user setting.
    if (!this._connected)
      return "talkilla16.png";

    return "talkilla16-online.png";
  },

  /**
   * Sends the current user data to Social
   */
  send: function() {
    var userData = {
      iconURL: this._rootURL + "/img/" + this.statusIcon,
      // XXX for now, we just hard-code the default avatar image.
      portrait: this._rootURL + "/img/default-avatar.png",
      userName: this._name,
      displayName: this._name,
      profileURL: this._rootURL + "/user.html"
    };

    browserPort.postEvent('social.user-profile', userData);
    tkWorker.ports.broadcastEvent('social.user-profile', userData);
  }
};

/**
 * Setups a SPA.
 *
 * @param {SPA} spa SPA container.
 */
function _setupSPA(spa) {
  spa.on("connected", function(data) {
    tkWorker.user.name = data.addresses[0].value;
    tkWorker.user.connected = true;
    this.capabilities = data.capabilities;

    // XXX Now we're connected, load the contacts database.
    // Really we should do this after successful sign-in or re-connect
    // but we don't have enough info for the worker for that yet
    tkWorker.loadContacts();

    tkWorker.ports.broadcastEvent("talkilla.spa-connected");
  });

  spa.on("message", function(label, data) {
    tkWorker.ports.broadcastDebug("spa event: " + label, data);
  });

  spa.on("message:users", function(data) {
    data.forEach(function(user) {
      tkWorker.users.set(user.nick, {presence: "connected"});
    });

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
  });

  spa.on("message:userJoined", function(userId) {
    tkWorker.users.set(userId, {presence: "connected"});

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
    tkWorker.ports.broadcastEvent("talkilla.user-joined", userId);
  });

  spa.on("message:userLeft", function(userId) {
    if (!tkWorker.users.has(userId))
      return;

    tkWorker.users.set(userId, {presence: "disconnected"});

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
    tkWorker.ports.broadcastEvent("talkilla.user-left", userId);
  });

  spa.on("offer", function(offerMsg) {
    // If we're in a conversation, and it is not with the peer,
    // then ignore it
    if (currentConversation) {
      // If the currentConversation window can handle the incoming call
      // data (e.g. peer matches) then just handle it.
      if (currentConversation.handleIncomingCall(offerMsg))
        return;

      // XXX currently, we can't handle more than one conversation
      // window open, so just ignore it.
      return;
    }

    currentConversation = new Conversation(spa, offerMsg.peer, offerMsg);
  });

  spa.on("answer", function(answerMsg) {
    if (currentConversation)
      currentConversation.callAccepted(answerMsg);
  });

  spa.on("hangup", function(hangupMsg) {
    if (currentConversation)
      currentConversation.callHangup(hangupMsg);
  });

  spa.on("ice:candidate", function(iceCandidateMsg) {
    if (currentConversation)
      currentConversation.iceCandidate(iceCandidateMsg);
  });

  spa.on("hold", function(holdMsg) {
    if (currentConversation)
      currentConversation.hold(holdMsg);
  });

  spa.on("resume", function(resumeMsg) {
    if (currentConversation)
      currentConversation.resume(resumeMsg);
  });

  spa.on("move-accept", function(moveAcceptMsg) {
    tkWorker.ports.broadcastEvent("talkilla.move-accept",
                                  moveAcceptMsg.toJSON());
  });

  spa.on("error", function(event) {
    tkWorker.ports.broadcastEvent("talkilla.spa-error", event);
  });

  spa.on("network-error", function(event) {
    // XXX: this will need future work to handle retrying presence connections
    tkWorker.ports.broadcastEvent('talkilla.presence-unavailable', event.code);

    tkWorker.closeSession();
  });

  spa.on("reauth-needed", function(event) {
    tkWorker.ports.broadcastEvent('talkilla.reauth-needed');
    tkWorker.closeSession();
  });
}

var handlers = {
  // SocialAPI events
  'social.port-closing': function() {
    tkWorker.ports.remove(this);
    if (browserPort === this)
      browserPort = undefined;
    if (currentConversation && currentConversation.port === this)
      currentConversation = undefined;
  },

  'social.initialize': function() {
    // Save the browserPort
    browserPort = this;

    // Don't have it in the main list of ports, as we don't need
    // to broadcast all our talkilla.* messages to the social api.
    tkWorker.ports.remove(this);

    tkWorker.initialize();
  },

  // Talkilla events
  'talkilla.contacts': function(event) {
    tkWorker.ports.broadcastDebug('talkilla.contacts', event.data.contacts);
    tkWorker.updateContactsFromSource(event.data.contacts, event.data.source);
  },

  'talkilla.conversation-open': function(event) {
    // XXX Temporarily work around to only allow one call at a time.
    if (!currentConversation)
      currentConversation = new Conversation(spa, event.data.peer);
  },

  'talkilla.chat-window-ready': function() {
    currentConversation.windowOpened(this);
  },

  /**
   * Called when the sidebar is ready.
   * The data for talkilla.sidebar-ready is:
   *
   * - nick: an optional previous nickname
   */
  'talkilla.sidebar-ready': function(event) {
    this.postEvent('talkilla.worker-ready');
    if (spa) {
      tkWorker.user.send();
      this.postEvent("talkilla.spa-connected");
      this.postEvent('talkilla.users', tkWorker.users.toArray());
    }
  },

  /**
   * Called when the chat window initiates a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Offer.
   */
  'talkilla.call-offer': function(event) {
    var offerMsg = new payloads.Offer(event.data);
    spa.callOffer(offerMsg);
  },

  /**
   * Called when the chat window accepts a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Answer.
   */
  'talkilla.call-answer': function(event) {
    var answerMsg = new payloads.Answer(event.data);
    spa.callAnswer(answerMsg);
  },

  /**
   * Called when hanging up a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Hangup.
   */
  'talkilla.call-hangup': function (event) {
    spa.callHangup(new payloads.Hangup(event.data));
  },

  /**
   * Called when hanging up a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.IceCandidate.
   */
  'talkilla.ice-candidate': function(event) {
    spa.iceCandidate(new payloads.IceCandidate(event.data));
  },

  /**
   * Called to forget the credentials of a SPA.
   *
   * @param {String} event.data the name of the SPA.
   */
  'talkilla.spa-forget-credentials': function(event) {
    // XXX: For now we have only one SPA so we don't need to use
    // event.data.
    spa.forgetCredentials();
  },

  /**
   * Called to enable a new SPA.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.SPASpec.
   */
  'talkilla.spa-enable': function(event) {
    var spec = new payloads.SPASpec(event.data);
    tkWorker.spaDb.add(spec, function(err) {
      // XXX: For now, we only support one SPA.
      spa = new SPA({src: spec.src});
      _setupSPA(spa);
      spa.connect(spec.credentials);
    });
  },

  /**
   * Called to disable an installed SPA.
   *
   * @param {String} event.data the name of the SPA to disable.
   */
  'talkilla.spa-disable': function(event) {
    // XXX: For now, we only support one SPA
    tkWorker.spaDb.drop();
    tkWorker.closeSession();
  },

  'talkilla.initiate-move': function(event) {
    spa.initiateMove(new payloads.Move(event.data));
  }
};

function Port(port) {
  this.port = port;
  this.id = port._portid;
  // configures this port
  port.onmessage = this.onmessage.bind(this);
}

Port.prototype = {
  /**
   * Posts an error event.
   * @param  {String} error
   */
  error: function(error) {
    this.postEvent("talkilla.error", error);
  },

  /**
   * Port message listener.
   * @param  {Event} event
   */
  onmessage: function(event) {
    var msg = event.data;
    if (msg && msg.topic && (msg.topic in handlers))
      handlers[msg.topic].call(this, msg);
    else
      this.error('Topic is missing or unknown');
  },

  /**
   * Posts a message event.
   * @param  {String} topic
   * @param  {Mixed}  data
   */
  postEvent: function(topic, data) {
    // FIXME: for no obvious reason, this may eventually fail if the port is
    //        closed, while it should never be the case
    this.port.postMessage({topic: topic, data: data});
  }
};

function PortCollection() {
  this.ports = {};
}

PortCollection.prototype = {
  /**
   * Configures and add a port to the stack.
   * @param  {Port} port
   */
  add: function(port) {
    if (port.id in this.ports)
      return;
    this.ports[port.id] = port;
  },

  /**
   * Removes a port from this collection.
   * @param  {Port} port
   */
  remove: function(port) {
    if (port && port.id)
      delete this.ports[port.id];
  },

  /**
   * Retrieves a port from the collection by its id.
   * @param  {String} id
   * @return {Port}
   */
  find: function(id) {
    return this.ports[id];
  },

  /**
   * Broadcasts a message to all ports.
   * @param  {String} topic
   * @param  {Mixed}  data
   */
  broadcastEvent: function(topic, data) {
    for (var id in this.ports)
      this.ports[id].postEvent(topic, data);
  },

  /**
   * Broadcast debug informations to all ports.
   */
  broadcastDebug: function(label, data) {
    if (!gConfig.DEBUG)
      return;
    for (var id in this.ports)
      this.ports[id].postEvent("talkilla.debug", {label: label, data: data});
  },

  /**
   * Broadcasts an error message to all ports.
   * @param  {String} message
   */
  broadcastError: function(message) {
    for (var id in this.ports)
      this.ports[id].error(message);
  }
};

/**
 * The main worker, which controls all the parts of the app.
 *
 * This keeps track of whether or not we're initialised, as it may be
 * that the sidebar or other panels are ready before the worker, and need
 * to know that the worker is actually ready to receive messages.
 *
 * @param {Object} options Options object
 *
 * Available options:
 * - {ContactsDB} contactsDb        The contacts database
 * - {UserData}          user       The current user object
 * - {CurrentUsers}      users      The object containing current users
 * - {PortCollection}    ports      The port collection object
 */
function TkWorker(options) {
  // XXX Move all globals into this constructor and create them here.
  options = options || {};
  this.contactsDb = options.contactsDb;
  this.spaDb = options.spaDb;
  this.user = options.user;
  this.users = options.users || new CurrentUsers();
  this.ports = options.ports;
}

TkWorker.prototype = {
  /**
   * Initializes the worker
   *
   * @param {Object} options Options object
   *
   * Available options:
   * - {
   */
  initialize: function() {
    // Now we're set up load the spa info
    this.loadSPAs();
  },

  /**
   * Closes current user session.
   */
  closeSession: function() {
    this.user.reset();
    this.users.reset();
    this.contactsDb.close();
    this.spaDb.close();
  },

  /**
   * Loads the contacts database and adds the contacts to the
   * current users list.
   *
   * Callback parameters:
   *   none
   */
  loadContacts: function(cb) {
    this.contactsDb.all(function(err, contacts) {
      if (err) {
        this.ports.broadcastError(err);
        if (typeof cb === "function")
          return cb.call(this, err);
        return;
      }
      this.updateContactList(contacts);
      // callback is mostly useful for tests
      if (typeof cb === "function")
        cb.call(this, null, contacts);
    }.bind(this));
  },

  updateContactsFromSource: function(contacts, source) {
    this.contactsDb.replaceSourceContacts(contacts, source);
    // XXX We should potentially source this from contactsDb, but it
    // is unclear at the moment if it is worth doing that or not.
    this.updateContactList(contacts);
  },

  /**
   * Updates the current users list with provided contacts.
   *
   * @param  {Array} contacts Contacts; format: [{username: "address"}]
   */
  updateContactList: function(contacts) {
    this.users.updateContacts(contacts);
    this.ports.broadcastEvent("talkilla.users", this.users.toArray());
  },

  loadSPAs: function(callback) {
    this.spaDb.all(function(err, specs) {
      tkWorker.ports.broadcastDebug("loaded specs", specs);
      specs.forEach(function(specData) {
        var spec = new payloads.SPASpec(specData);

        // XXX: For now, we only support one SPA.
        spa = new SPA({src: spec.src});
        _setupSPA(spa);
        spa.connect(spec.credentials);

        if (callback)
          callback();
      });
    });
  }
};

// Main Initialisations

tkWorker = new TkWorker({
  ports: new PortCollection(),
  user: new UserData({}, gConfig),
  users: new CurrentUsers(),
  contactsDb: new ContactsDB({
    dbname: "TalkillaContacts",
    storename: "contacts"
  }),
  spaDb: new SPADB({
    dbname: "EnabledSPA",
    storename: "enabled-spa"
  })
});

function onconnect(event) {
  tkWorker.ports.add(new Port(event.ports[0]));
}
