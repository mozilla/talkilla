/* global indexedDB, importScripts, SPA, HTTP, ContactsDB, SPADB,
   CurrentUsers, loadConfig, payloads, Conversation, dump */
/* jshint unused:false */
"use strict";

// XXX: Try to import Backbone only in files that need it (and check
// if multiple imports cause problems).
importScripts(
  '../vendor/backbone-events-standalone-0.1.5.js',
  '/config.js',
  'payloads.js',
  'addressbook/contactsdb.js',
  'spadb.js',
  '/js/http.js',
  'worker/users.js',
  'worker/spa.js',
  'worker/conversation.js'
);

var gConfig = loadConfig();
var browserPort;
var currentConversation;
// XXX Initialised at end of file whilst we move everything
// into it.
var tkWorker;

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
    var iconURL = this._rootURL + "/img/" + this.statusIcon;

    var userData = {
      iconURL: iconURL,
      // XXX for now, we just hard-code the default avatar image.
      portrait: this._rootURL + "/img/default-avatar.png",
      userName: this._name,
      displayName: this._name,
      profileURL: this._rootURL + "/user.html"
    };

    // This needs to be sent to the browser for Firefox 28 and earlier
    // (pre bug 935640).
    browserPort.postEvent('social.user-profile', userData);

    // XXX This could be simplified to just send the userName (and renamed).
    tkWorker.ports.broadcastEvent('social.user-profile', userData);

    // This is needed for Firefox 29 onwards (post bug 935640).
    browserPort.postEvent('social.ambient-notification', {
      iconURL: iconURL
    });
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

    tkWorker.ports.broadcastEvent("talkilla.spa-connected",
      {"capabilities": data.capabilities});
  });

  spa.on("message", function(textMsg) {
    // If we're in a conversation, and it is not with the peer,
    // then ignore it
    if (!currentConversation) {
      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: tkWorker.users.get(textMsg.peer),
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      tkWorker.contactsDb.add({username: textMsg.peer}, function(err) {
        if (err)
          tkWorker.ports.broadcastError(err);
      });
    }
    currentConversation.handleIncomingText(textMsg);
  });

  spa.on("users", function(data) {
    data.forEach(function(user) {
      tkWorker.users.set(user.nick,
                         {username: user.nick, presence: "connected"});
    });

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
  });

  spa.on("userJoined", function(userId) {
    tkWorker.users.set(userId, {username:userId, presence: "connected"});

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
    tkWorker.ports.broadcastEvent("talkilla.user-joined", userId);
  });

  spa.on("userLeft", function(userId) {
    if (!tkWorker.users.has(userId))
      return;

    tkWorker.users.set(userId, {presence: "disconnected"});

    tkWorker.ports.broadcastEvent("talkilla.users", tkWorker.users.toArray());
    tkWorker.ports.broadcastEvent("talkilla.user-left", userId);
  });

  spa.on("offer", function(offerMsg) {
    // If we're in a conversation, and it is not with the peer,
    // then ignore it
    if (!currentConversation) {
      currentConversation = new Conversation({
        capabilities: tkWorker.spa.capabilities,
        peer: tkWorker.users.get(offerMsg.peer),
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      tkWorker.contactsDb.add({username: offerMsg.peer}, function(err) {
        if (err)
          tkWorker.ports.broadcastError(err);
      });
    }

    currentConversation.handleIncomingCall(offerMsg);
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
                                  moveAcceptMsg);
  });

  spa.on("error", function(event) {
    tkWorker.ports.broadcastEvent("talkilla.error", event);
  });

  spa.on("reconnection", function(reconnectionMsg) {
    tkWorker.ports.broadcastEvent('talkilla.server-reconnection',
                                  reconnectionMsg);
  });

  spa.on("reauth-needed", function(event) {
    tkWorker.ports.broadcastEvent('talkilla.reauth-needed');
    tkWorker.closeSession();
  });

  spa.on("instantshare", function(instantShareMsg) {
    // If we're in a conversation, and it is not with the peer,
    // then ignore it
    if (!currentConversation) {
      currentConversation = new Conversation({
        capabilities: spa.capabilities,
        peer: tkWorker.users.get(instantShareMsg.peer),
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });
      tkWorker.contactsDb.add({username: instantShareMsg.peer}, function(err) {
        if (err)
          tkWorker.ports.broadcastError(err);
      });
    }

    currentConversation.startCall();
  });
}

var handlers = {
  // SocialAPI events
  'social.port-closing': function() {
    // broadcastDebug won't work here, because the port is dead, so we
    // use dump
    dump("social.port-closing called; about to remove port. this = " + this);
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
    if (!currentConversation){
      currentConversation = new Conversation({
        capabilities: tkWorker.spa.capabilities,
        peer: tkWorker.users.get(event.data.peer),
        browserPort: browserPort,
        users: tkWorker.users,
        user: tkWorker.user
      });

      // For collected contacts
      tkWorker.contactsDb.add({username: event.data.peer}, function(err) {
          if (err)
            tkWorker.ports.broadcastError(err);
        });
    }
  },

  'talkilla.chat-window-ready': function() {
    currentConversation.windowOpened(this);
  },

  /**
   * Called when the sidebar is ready.
   */
  'talkilla.sidebar-ready': function(event) {
    if (tkWorker.initialized)
      tkWorker.onInitializationComplete(this);
  },

  /**
   * Called when the chat window initiates a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Offer.
   */
  'talkilla.call-offer': function(event) {
    var offerMsg = new payloads.Offer(event.data);
    tkWorker.spa.callOffer(offerMsg);
  },

  /**
   * Called when the chat window accepts a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Answer.
   */
  'talkilla.call-answer': function(event) {
    var answerMsg = new payloads.Answer(event.data);
    tkWorker.spa.callAnswer(answerMsg);
  },

  /**
   * Called when hanging up a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.Hangup.
   */
  'talkilla.call-hangup': function (event) {
    tkWorker.spa.callHangup(new payloads.Hangup(event.data));
  },

  /**
   * Called when hanging up a call.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.IceCandidate.
   */
  'talkilla.ice-candidate': function(event) {
    tkWorker.spa.iceCandidate(new payloads.IceCandidate(event.data));
  },

  /**
   * Called to forget the credentials of a SPA.
   *
   * @param {String} event.data the name of the SPA.
   */
  'talkilla.spa-forget-credentials': function(event) {
    // XXX: For now we have only one SPA so we don't need to use
    // event.data.
    tkWorker.spa.forgetCredentials();
  },

  /**
   * Called to enable a new SPA.
   *
   * @param {Object} event.data a data structure representation of a
   * payloads.SPASpec.
   */
  'talkilla.spa-enable': function(event) {
    var spec = new payloads.SPASpec(event.data);

    tkWorker.spaDb.store(spec, function(err) {
      if (err)
        return tkWorker.ports.broadcastError("Error adding SPA", err);

      // Try starting the SPA even if there's an error adding it - at least
      // the user can possibly get into it.
      tkWorker.createSPA(spec);
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

  /**
   * Called when receiving an arbitrary message that needs to go
   * through the SPA.
   *
   * @param {Object} event.data arbitrary data.
   */
  'talkilla.spa-channel-message': function(event) {
    tkWorker.spa.sendMessage(new payloads.SPAChannelMessage(event.data));
  },

  'talkilla.initiate-move': function(event) {
    tkWorker.spa.initiateMove(new payloads.Move(event.data));
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
    // broadcastDebug isn't reliable here, because the port may be dead, so we
    // use dump
    try {
      dump("PortCollection.remove called, id = " + port.id);
    } catch (ex) {
      dump("PortCollection.remove logging exception" + ex);
    }
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
  this.initialized = false;
  // XXX In future, this may switch to supporting multiple SPAs
  this.spa = undefined;
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
    this.loadSPAs(function(err) {
      if (err)
        tkWorker.ports.broadcastError("Error loading spa specs");

      // Even if there were errors, assume initialization is complete
      // so that we can continue to function.
      this.initialized = true;

      this.onInitializationComplete();
    }.bind(this));
  },

  /**
   * Notify the ports the worker has been fully initialized.
   *
   * @param {Port} Optional. Which port to notify. If not specified all known
   *                         ports will be notified.
   *
   */
  onInitializationComplete: function(port) {
    // Post to the port if specified, else to all ports.
    if (port)
      port.postEvent('talkilla.worker-ready');
    else
      this.ports.broadcastEvent('talkilla.worker-ready');

    if (this.spa && this.spa.connected) {
      this.user.send();
      if (port) {
        port.postEvent("talkilla.spa-connected",
                       {capabilities: this.spa.capabilities});
        port.postEvent('talkilla.users', this.users.toArray());
      }
      else {
        this.ports.broadcastEvent("talkilla.spa-connected",
                                  {capabilities: this.spa.capabilities});
        this.ports.broadcastEvent('talkilla.users', this.users.toArray());
      }
    }
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

  /**
   * Creates and sets up the SPA object. The SPA is informed to start
   * its connection but it may not have completed.
   * XXX Assumes there is a single SPA, in future this may change.
   *
   * @param {payloads.SPASpec} spec The SPA specification
   */
  createSPA: function(spec) {
    this.spa = new SPA({src: spec.src});
    _setupSPA(this.spa);
    this.spa.connect(spec.credentials);
  },

  /**
   * Loads the SPA database.
   * XXX Assumes there is a single SPA, in future this may change.
   *
   *
   * @param {Function} callback Callback
   *
   * When the callback is involked the parameter is:
   *
   * @param {Object} err  Undefined if no error, an error object on error.
   */
  loadSPAs: function(callback) {
    this.spaDb.all(function(err, specs) {
      tkWorker.ports.broadcastDebug("loaded specs", specs);

      if (err) {
        if (callback)
          callback(err);
        return;
      }

      specs.forEach(function(specData) {
        var spec = new payloads.SPASpec(specData);

        tkWorker.createSPA(spec);

      });

      if (callback)
        callback();
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
