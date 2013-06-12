/* jshint unused:false */

var _config = {DEBUG: false};
var _currentUserData;
var _presenceSocket;
var ports;
var browserPort;
var currentCall;
var currentUsers;

function openChatWindow() {
  browserPort.postEvent('social.request-chat', 'chat.html');
}

/**
 * Social API user profile data storage.
 * @param {Object|undefined}  initial  Initial data
 * @param {Object|undefined}  config   Environment configuration
 */
function UserData(initial, config) {
  var rootURL = config ? config.ROOTURL : '';

  this.defaults = {
    iconURL: rootURL + "/talkilla16.png",
    portrait: undefined,
    userName: undefined,
    displayName: undefined,
    profileURL: rootURL + "/user.html"
  };

  this.reset();

  if (initial) {
    for (var key in initial)
      this[key] = initial[key];
  }
}

UserData.prototype = {
  /**
   * Resets current properties to default ones.
   */
  reset: function() {
    for (var key in this.defaults)
      this[key] = this.defaults[key];
  }
};

var serverHandlers = {
  'users': function(data) {
    currentUsers = data;
    ports.broadcastEvent("talkilla.users", data);
  },

  'incoming_call': function(data) {
    currentCall = {port: undefined, data: data};
    openChatWindow();
  },

  'call_accepted': function(data) {
    currentCall.port.postEvent('talkilla.call-establishment', data);
  },

  'call_hangup': function(data) {
    currentCall.port.postEvent('talkilla.call-hangup', data);
    currentCall = undefined;
  }
};

function _presenceSocketOnMessage(event) {
  var data = JSON.parse(event.data);
  for (var eventType in data)
    if (eventType in serverHandlers)
      serverHandlers[eventType](data[eventType]);
    else
      ports.broadcastEvent("talkilla." + eventType, data[eventType]);
}

function _presenceSocketSendMessage(data) {
  _presenceSocket.send(data);
}

function _presenceSocketOnOpen(event) {
  "use strict";

  ports.broadcastEvent("talkilla.presence-open", event);
}

function _presenceSocketOnError(event) {
  "use strict";

  ports.broadcastEvent("talkilla.websocket-error", event);
}

function _presenceSocketOnClose(event) {
  "use strict";

  // XXX: this will need future work to handle retrying presence connections
  ports.broadcastEvent('talkilla.presence-unavailable', event.code);
  currentUsers = undefined;
}

function _setupWebSocket(ws) {
  ws.onopen = _presenceSocketOnOpen;
  ws.onmessage = _presenceSocketOnMessage;
  ws.onerror = _presenceSocketOnError;
  ws.onclose = _presenceSocketOnClose;
}

function createPresenceSocket(nickname) {
  "use strict";

  _presenceSocket = new WebSocket(_config.WSURL + "?nick=" + nickname);
  _setupWebSocket(_presenceSocket);

  ports.broadcastEvent("talkilla.presence-pending", {});
}

function _loginExpired() {
  _presenceSocket.removeEventListener("error", _loginExpired);
  ports.broadcastEvent("talkilla.logout-success", {});
}

function _setUserProfile(username) {
  _currentUserData.userName = _currentUserData.displayName = username;
  _currentUserData.portrait = "test.png";
  browserPort.postEvent('social.user-profile', _currentUserData);
}

function _presenceSocketReAttached(username, event) {
  _presenceSocket.removeEventListener("open", _presenceSocketReAttached);
  _setupWebSocket(_presenceSocket);
  _setUserProfile(username);
  _presenceSocketOnOpen(event);
  ports.broadcastEvent("talkilla.login-success", {username: username});
}

function tryPresenceSocket(nickname) {
  "use strict";

  _presenceSocket = new WebSocket(_config.WSURL + "?nick=" + nickname);
  _presenceSocket.addEventListener(
    "open", _presenceSocketReAttached.bind(this, nickname));
  _presenceSocket.addEventListener("error", _loginExpired);
  ports.broadcastEvent("talkilla.presence-pending", {});
}

function sendAjax(url, method, data, cb) {
  var xhr = new XMLHttpRequest();

  xhr.onload = function(event) {
    // sinon.js can call us with a null event a second time, so just ignore it.
    if (!event)
      return;
    if (xhr.readyState === 4 && xhr.status === 200)
      return cb(null, xhr.responseText);
    cb(xhr.statusText);
  };

  xhr.onerror = function(event) {
    if (event && event.target)
      cb(event.target.status ? event.target.statusText : "We are offline");
  };

  xhr.open(method || 'GET', url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
}

function loadconfig(cb) {
  sendAjax('/config.json', 'GET', {}, function(err, data) {
    var config;
    try {
      config = JSON.parse(data);
    } catch (err) {
      return cb(err);
    }
    cb(null, config);
  });
}

function _signinCallback(err, responseText) {
  if (err)
    return this.postEvent('talkilla.login-failure', err);
  var username = JSON.parse(responseText).nick;
  if (username) {
    _setUserProfile(username);

    ports.broadcastEvent('talkilla.login-success', {
      username: username
    });

    createPresenceSocket(username);
  }
}

function _signoutCallback(err, responseText) {
  if (err)
    return this.postEvent('talkilla.error', 'Bad signout:' + err);

  _currentUserData.reset();
  browserPort.postEvent('social.user-profile', _currentUserData);
  currentUsers = undefined;
  ports.broadcastEvent('talkilla.logout-success');
}

var handlers = {
  // SocialAPI events
  'social.port-closing': function() {
    ports.remove(this);
  },

  'social.initialize': function() {
    browserPort = this;
  },

  // Talkilla events
  'talkilla.login': function(msg) {
    if (!msg.data || !msg.data.username) {
      return this.postEvent('talkilla.login-failure', 'no username specified');
    }

    this.postEvent('talkilla.login-pending', null);

    sendAjax('/signin', 'POST', {nick: msg.data.username},
      _signinCallback.bind(this));
  },

  'talkilla.logout': function() {
    if (!_currentUserData.userName) {
      return this.postEvent('talkilla.error',
                            'trying to logout when not logged in');
    }

    _presenceSocket.close();
    sendAjax('/signout', 'POST', {nick: _currentUserData.userName},
      _signoutCallback.bind(this));
  },

  'talkilla.call-start': function(event) {
    // XXX Temporarily work around to only allow one call at a time.
    if (!currentCall) {
      currentCall = {port: undefined, data: event.data};
      openChatWindow();
    }
  },

  'talkilla.chat-window-ready': function() {
    currentCall.port = this;

    if (_currentUserData.userName) {
      // If there's currenty a logged in user,
      this.postEvent('talkilla.login-success', {
        username: _currentUserData.userName
      });
    }

   // If this is an incoming call, we won't have the port yet.
    var topic = currentCall.data.offer ?
      "talkilla.call-incoming" :
      "talkilla.call-start";

    this.postEvent(topic, currentCall.data);
  },

  'talkilla.sidebar-ready': function(event) {
    if (_currentUserData.userName) {
      // If there's currently a logged in user,
      this.postEvent('talkilla.login-success', {
        username: _currentUserData.userName
      });
      if (currentUsers)
        this.postEvent('talkilla.users', currentUsers);
    } else if (event.data.nick) {
      // No user data available, may still be logged in
      tryPresenceSocket(event.data.nick);
    }
  },

  /**
   * The data for talkilla.call-offer is:
   *
   * - callee: the person you are calling
   * - caller: the person who is calling you
   * - offer: an RTCSessionDescription containing the sdp data for the call.
   */
  'talkilla.call-offer': function(event) {
    _presenceSocketSendMessage(JSON.stringify({ 'call_offer': event.data }));
  },

  /**
   * The data for talkilla.call-answer is:
   *
   * - callee: the person you are calling
   * - caller: the person who is calling you
   * - offer: an RTCSessionDescription containing the sdp data for the call.
   */
  'talkilla.call-answer': function (event) {
    _presenceSocketSendMessage(JSON.stringify({ 'call_accepted': event.data }));
  },

  /**
   * Ends a call. The expected data is:
   *
   * - other: the person you are talking to.
   */
  'talkilla.call-hangup': function (event) {
    _presenceSocketSendMessage(JSON.stringify({ 'call_hangup': event.data }));
    currentCall = undefined;
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
   * Broadcasts an error message to all ports.
   * @param  {String} message
   */
  broadcastError: function(message) {
    for (var id in this.ports)
      this.ports[id].error(message);
  }
};

ports = new PortCollection();

function onconnect(event) {
  ports.add(new Port(event.ports[0]));
}

loadconfig(function(err, config) {
  if (err)
    return ports.broadcastError(err);
  _config = config;
  _currentUserData = new UserData({}, config);
});
