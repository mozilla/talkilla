/* jshint unused:false */

var _config = {DEBUG: false};
var _presenceSocket;
var ports;

function _presenceSocketOnMessage(event) {
  var data = JSON.parse(event.data);
  for (var eventType in data) {
    ports.broadcastEvent(eventType, data[eventType]);
  }
}

function _presenceSocketOnError(event) {
  "use strict";

  ports.broadcastEvent("talkilla.websocket-error", event);
}

function _presenceSocketOnClose(event) {
  "use strict";

  ports.broadcastEvent("talkilla.websocket-close", event);
}

function createPresenceSocket(nickname) {
  "use strict";

  _presenceSocket = new WebSocket(_config.WSURL + "?nick=" + nickname);
  _presenceSocket.onmessage = _presenceSocketOnMessage;
  _presenceSocket.onerror = _presenceSocketOnError;
  _presenceSocket.onclose = _presenceSocketOnClose;
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

function loadconfig() {
  sendAjax('/config.json', 'GET', {}, function(err, data) {
    if (err)
      return ports.broadcastError(err);
    _config = JSON.parse(data);
  });
}

var handlers = {
  // SocialAPI events
  'social.port-closing': function() {
    ports.remove(this);
  },

  // Talkilla events
  'talkilla.login': function(msg) {
    if (!msg.data || !msg.data.username) {
      return this.postEvent("talkilla.login-failure", "no username specified");
    }

    this.postEvent("talkilla.login-pending", null);

    sendAjax('/signin', 'POST', {nick: msg.data.username},
      function(err, responseText) {
        if (err)
          return this.postEvent('talkilla.login-failure', err);
        return this.postEvent('talkilla.login-success', {
          username: JSON.parse(responseText).nick
        });
      }.bind(this));
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
    if (msg && msg.topic && msg.topic in handlers)
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
    for (var id in this.ports) {
      this.ports[id].postEvent(topic, data);
    }
  },

  /**
   * Broadcasts an error message to all ports.
   * @param  {String} message
   */
  broadcastError: function(message) {
    for (var id in this.ports) {
      this.ports[id].error(message);
    }
  }
};

ports = new PortCollection();

function onconnect(event) {
  ports.add(new Port(event.ports[0]));
}

loadconfig();
