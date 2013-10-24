/* global indexedDB, importScripts, SPA, HTTP, CollectedContacts, CurrentUsers,
   loadConfig  */
/* jshint unused:false */

// XXX: Try to import Backbone only in files that need it (and check
// if multiple imports cause problems).
importScripts('../vendor/backbone-events-standalone-0.1.5.js');
importScripts('/config.js', 'addressbook/collected.js');
importScripts('worker/http.js', 'worker/users.js', 'worker/spa.js');

var gConfig = loadConfig();
var _loginPending = false;
var _autologinPending = false;
var browserPort;
var currentConversation;
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
 * @param {Object|undefined}  data  Initial data
 *
 * data properties:
 *
 * peer: The id of the peer this conversation window is for.
 * offer: optional data for incoming calls.
 */
function Conversation(data) {
  this.data = data;
  this.port = undefined;
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

    if (tkWorker.user.name) {
      // If there's currenty a logged in user,
      port.postEvent('talkilla.login-success', {
        username: tkWorker.user.name
      });
      this.data.user = tkWorker.user.name;
    }

    this._sendCall();
  },

  /**
   * Returns true if this conversation window is for the specified
   * peer and the incoming call data is passed to that window.
   *
   * @param peer The id of the peer to compare with.
   */
  handleIncomingCall: function(data) {
    tkWorker.ports.broadcastDebug('handle incoming call', data);

    if (this.data.peer !== data.peer)
      return false;

    if (tkWorker.user)
      data.user = tkWorker.user.name;

    this.data = data;

    this._sendCall();
    return true;
  },

  /**
   * Sends call information to the conversation window.
   *
   * If the window is not yet completely open, this will queue the
   * message to the window. When the window is opened, this function
   * is called again and will send the queued messages.
   */
  _sendCall: function() {
    tkWorker.contactsDb.add({username: this.data.peer}, function(err) {
      if (err)
        tkWorker.ports.broadcastError(err);
    });

    // retrieve peer presence information
    this.data.peerPresence = tkWorker.users.getPresence(this.data.peer);

    var topic = this.data.offer ?
      "talkilla.conversation-incoming" :
      "talkilla.conversation-open";

    // Check if the window has completed opening
    if (!this.port) {
      tkWorker.ports.broadcastDebug("queuing offer!");
      this.messageQueue.push({topic: topic, data: this.data});
    }
    else {
      this.port.postEvent(topic, this.data);

      this.messageQueue.forEach(function(message) {
        this.port.postEvent(message.topic, message.data);
      }, this);

      this.messageQueue = [];
    }
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
    // It is possible for the candidate to get here before we've got
    // the window and port set up, so record this for when they are
    // set up.
    if (!this.port)
      this.messageQueue.push({topic: 'talkilla.ice-candidate', data: data});
    else
      this.port.postEvent('talkilla.ice-candidate', data);
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
 * connected: Whether or not the websocket to the server is connected.
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
  }
};

function _setupSPA(spa) {
  spa.on("connected", function() {
    _autologinPending = false;
    tkWorker.user.connected = true;
    // XXX: we should differentiate login and presence
    tkWorker.ports.broadcastEvent('talkilla.login-success', {
      username: tkWorker.user.name
    });

    // XXX Now we're connected, load the contacts database.
    // Really we should do this after successful sign-in or re-connect
    // but we don't have enough info for the worker for that yet
    tkWorker.loadContacts();
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

  spa.on("offer", function(offer, from, textChat) {
    var data = {offer: offer, peer: from};
    if (textChat)
      data.textChat = textChat;

    // If we're in a conversation, and it is not with the peer,
    // then ignore it
    if (currentConversation) {
      // If the currentConversation window can handle the incoming call
      // data (e.g. peer matches) then just handle it.
      if (currentConversation.handleIncomingCall(data))
        return;

      // XXX currently, we can't handle more than one conversation
      // window open, so just ignore it.
      return;
    }

    currentConversation = new Conversation(data);
  });

  spa.on("answer", function(answer, from, textChat) {
    var data = {answer: answer, peer: from};
    if (textChat)
      data.textChat = textChat;
    currentConversation.callAccepted(data);
  });

  spa.on("hangup", function(from) {
    var data = {peer: from};
    if (currentConversation)
      currentConversation.callHangup(data);
  });

  spa.on("ice:candidate", function(peer, candidate) {
    var data = {peer: peer, candidate: candidate};
    if (currentConversation)
      currentConversation.iceCandidate(data);
  });

  spa.on("error", function(event) {
    tkWorker.ports.broadcastEvent("talkilla.websocket-error", event);
  });

  spa.on("disconnected", function(event) {
    _autologinPending = false;

    // XXX: this will need future work to handle retrying presence connections
    tkWorker.ports.broadcastEvent('talkilla.presence-unavailable', event.code);

    tkWorker.closeSession();
  });

  spa.on("reauth-needed", function(event) {
    _autologinPending = false;
    tkWorker.ports.broadcastEvent('talkilla.reauth-needed');
  });
}

function _signinCallback(err, responseText) {
  _loginPending = false;
  var data = JSON.parse(responseText);
  if (err)
    return this.postEvent('talkilla.login-failure', data.error);
  var username = data.nick;
  if (username) {
    tkWorker.user.name = username;

    spa.connect({nick: username});
    tkWorker.ports.broadcastEvent("talkilla.presence-pending", {});
  }
}

function _signoutCallback(err, responseText) {
  _loginPending = false;
  if (err)
    return this.postEvent('talkilla.error', 'Bad signout:' + err);

  tkWorker.closeSession();
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

    // Now we're connected request any cookies that we've got saved.
    browserPort.postEvent('social.cookies-get');

    // Don't have it in the main list of ports, as we don't need
    // to broadcast all our talkilla.* messages to the social api.
    tkWorker.ports.remove(this);
  },

  'social.cookies-get-response': function(event) {
    var cookies = event.data;
    cookies.forEach(function(cookie) {
      if (cookie.name === "nick") {
        _autologinPending = true;
        tkWorker.user.name = cookie.value;
        spa.connect({nick: cookie.value});
      }
    });
  },

  // Talkilla events
  'talkilla.contacts': function(event) {
    tkWorker.ports.broadcastDebug('talkilla.contacts', event.data.contacts);
    tkWorker.updateContactList(event.data.contacts);
  },

  'talkilla.login': function(msg) {
    if (!msg.data || !msg.data.assertion) {
      return this.postEvent('talkilla.login-failure', 'no assertion given');
    }
    if (_loginPending || _autologinPending)
      return;

    _loginPending = true;
    this.postEvent('talkilla.login-pending', null);

    spa.signin(msg.data.assertion, _signinCallback.bind(this));
  },

  'talkilla.logout': function() {
    if (!tkWorker.user.name)
      return;

    spa.signout(tkWorker.user.name, _signoutCallback.bind(this));
  },

  'talkilla.conversation-open': function(event) {
    // XXX Temporarily work around to only allow one call at a time.
    if (!currentConversation)
      currentConversation = new Conversation(event.data);
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
    if (tkWorker.user.name && tkWorker.user.connected) {
      // If there's currently a logged in user,
      this.postEvent('talkilla.login-success', {
        username: tkWorker.user.name
      });
    }
  },

  /**
   * Called when the sidebar request the initial presence state.
   */
  'talkilla.presence-request': function(event) {
    var users = tkWorker.users.toArray();
    spa.presenceRequest(tkWorker.user.name);
    this.postEvent('talkilla.users', users);
  },

  /**
   * The data for talkilla.call-offer is:
   *
   * - peer:     the person you are calling
   * - textChat: is this a text chat offer?
   * - offer:    an RTCSessionDescription containing the sdp data for the call.
   */
  'talkilla.call-offer': function(event) {
    spa.callOffer(event.data.offer, event.data.peer, event.data.textChat);
  },

  /**
   * The data for talkilla.call-answer is:
   *
   * - peer:     the person who is calling you
   * - textChat: is this a text chat offer?
   * - answer:   an RTCSessionDescription containing the sdp data for the call.
   */
  'talkilla.call-answer': function(event) {
    spa.callAnswer(event.data.answer, event.data.peer, event.data.textChat);
  },

  /**
   * Ends a call. The expected data is:
   *
   * - peer: the person you are talking to.
   */
  'talkilla.call-hangup': function (event) {
    spa.callHangup(event.data.peer);
  },

  /**
   * Handles an ICE candidate
   *
   * - peer: the person you are talking to
   * - candidate: an mozRTCIceCandidate for the candidate
   */
  'talkilla.ice-candidate': function(event) {
    spa.iceCandidate(event.data.peer, event.data.candidate);
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
 * - {CollectedContacts} contactsDb The collected contacts database
 * - {UserData}          user       The current user object
 * - {CurrentUsers}      users      The object containing current users
 * - {PortCollection}    ports      The port collection object
 */
function TkWorker(options) {
  // XXX Move all globals into this constructor and create them here.
  options = options || {};
  this.contactsDb = options.contactsDb;
  this.user = options.user;
  this.users = options.users || new CurrentUsers();
  this.ports = options.ports;
}

TkWorker.prototype = {
  /**
   * Closes current user session.
   */
  closeSession: function() {
    this.user.reset();
    this.users.reset();
    this.contactsDb.close();
    this.ports.broadcastEvent('talkilla.logout-success', {});
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

  /**
   * Updates the current users list with provided contacts.
   *
   * @param  {Array} contacts Contacts; format: [{username: "address"}]
   */
  updateContactList: function(contacts) {
    this.users.updateContacts(contacts);
    this.ports.broadcastEvent("talkilla.users", this.users.toArray());
  }
};

// Main Initialisations

spa = new SPA({src: "/js/spa/talkilla_worker.js"});
_setupSPA(spa);

tkWorker = new TkWorker({
  ports: new PortCollection(),
  user: new UserData({}, gConfig),
  users: new CurrentUsers(),
  contactsDb: new CollectedContacts({
    dbname: "TalkillaContacts",
    storename: "contacts",
    version: 1
  })
});

function onconnect(event) {
  tkWorker.ports.add(new Port(event.ports[0]));
}
