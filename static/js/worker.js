/* jshint unused:false */

var appData = {};

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
    else {
      this.postEvent("talkilla.login-pending", null);

      sendAjax('/signin', {nick: msg.data.username},
        function(err, responseText) {
          if (err)
            return this.postEvent('talkilla.login-failure', err);

          appData.username = JSON.parse(responseText).nick;
          return this.postEvent('talkilla.login-success',
                                {username: appData.username});
        }.bind(this));
    }
  },
  'talkilla.logout': function(msg) {
    if (!('username' in appData)) {
      this.postEvent("talkilla.logout-failure",
                     "no username specified");
      return;
    }
    else {
      this.postEvent("talkilla.logout-pending", null);

      sendAjax('/signout', {nick: appData.username},
        function(err, responseText) {
          if (err)
            return this.postEvent('talkilla.logout-failure', err);

          appData.username = null;
          return this.postEvent('talkilla.logout-success');
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
