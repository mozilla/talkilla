/* jshint unused:false */

function sendAjax(url, data, cb) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function(event) {
    cb(null, event.target.responseText);
  };
  xhr.onerror = function(event) {
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
    else {
      this.postEvent("talkilla.login-pending", null);

      sendAjax('/signin', {nick: msg.data.username},
        function(err, responseText) {
          if (err)
            return this.postEvent('talkilla.login-failure', err);
          return this.postEvent('talkilla.login-success',
                                {username: JSON.parse(responseText).nick});
        }.bind(this));
    }
  }
};

function Port(port) {
  this.port = port;
  port.onmessage = this.onmessage.bind(this);
}
Port.prototype = {
  onmessage: function(event) {
    var msg = event.data;
    if (msg && msg.topic && msg.topic in handlers)
      handlers[msg.topic].call(this, msg);
    else
      this.error('Topic is missing or unknown');
  },
  postEvent: function(topic, data) {
    this.port.postMessage({topic: topic, data: data});
  },
  error: function(message) {
    this.postEvent("talkilla.error", message);
  }
};

function onconnect(event) {
  new Port(event.ports[0]);
}
