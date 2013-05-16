/* jshint unused:false */

function error(port, message) {
  port.postMessage({
    topic: 'talkilla.error',
    data: message
  });
}

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
  'talkilla.login': function(port, msg) {
    if (!msg.data || !msg.data.username) {
      port.postMessage({
        topic: "talkilla.login-failure",
        data: "no username specified"
      });
      return;
    }
    else {
      port.postMessage({
        topic: "talkilla.login-pending",
        data: null
      });

      sendAjax('/signin', {nick: msg.data.username},
        function(err, responseText) {
          if (err)
            return port.postMessage({
              topic: 'talkilla.login-failure',
              data: err
            });
          return port.postMessage({
            topic: 'talkilla.login-success',
            data: {username: JSON.parse(responseText).nick}
          });
        });
    }
  }
};


function onconnect(event) {
  var port = event.ports[0];

  port.onmessage = function(event) {
    var msg = event.data;
    if (msg && msg.topic && msg.topic in handlers)
      handlers[msg.topic](port, msg);
    else
      error(port, 'Topic is missing or unknown');
  };
}
