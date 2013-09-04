/* jshint unused:false */

var Server = (function() {
  function Server() {
  }

  Server.prototype.request = function(method, url, data, callback) {
    var xhr = new XMLHttpRequest();

    xhr.onload = function(event) {
      // sinon.js can call us with a null event a second time, so just
      // ignore it.
      if (!event)
        return;
      if (xhr.readyState === 4 && xhr.status === 200)
        return callback(null, xhr.responseText);
      callback(xhr.statusText, xhr.responseText);
    };

    xhr.onerror = function(event) {
      var target = event && event.target;
      if (target)
        callback(target.status ? target.statusText : "We are offline");
    };

    xhr.open(method || 'GET', url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
  };

  Server.prototype.post = function(url, data, callback) {
    this.request("POST", url, data, callback);
  };

  Server.prototype.signin = function(assertion, callback) {
    this.post("/signin", {assertion: assertion}, callback);
  };

  Server.prototype.signout = function(nick, callback) {
    this.post("/signout", {nick: nick}, callback);
  };

  return Server;
}());
