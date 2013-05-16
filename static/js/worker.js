/* jshint unused:false */
function onconnect(event) {
  var port = event.ports[0];
  port.onmessage = function(event) {
    var msg = event.data;
    if (msg.topic === "talkilla.login") {
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
      }
    }
  };
}
