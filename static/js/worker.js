/* jshint unused:false */

function sendAjax(url, data, cb) {
  var xhr = new XMLHttpRequest();

  xhr.onload = function(event) {
    // sinon.js can call us with a null event a second time, so just ignore it.
    if (event) {
      if (xhr.readyState === 4 && xhr.status === 200)
        cb(null, xhr.responseText);
      else
        cb(xhr.statusText);
    }
  };

  xhr.onerror = function(event) {
    if (event && event.target)
      cb(event.target.status ? event.target.statusText : "We are offline");
  };
  xhr.open('POST', url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(data));
}

var handlers = {
  'talkilla.login': function(msg) {
    if (!msg.data || !msg.data.username) {
      this.postEvent("talkilla.login-failure",
                     "no username specified");
      return;
    }

    this.postEvent("talkilla.login-pending", null);

    sendAjax('/signin', {nick: msg.data.username},
      function(err, responseText) {
        if (err)
          return this.postEvent('talkilla.login-failure', err);
        return this.postEvent('talkilla.login-success',
                              {username: JSON.parse(responseText).nick});
      }.bind(this));
  }
};

function Port(port) {
  this.port = port;
  this.id = port._portid;
  // configures this port
  this.port.onmessage = this.onmessage.bind(this);
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
  }.bind(this),

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

var ports = new PortCollection();

function onconnect(event) {
  ports.add(new Port(event.ports[0]));
}
