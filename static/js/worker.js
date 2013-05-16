/* jshint unused:false */
function onconnect(event) {
  var port = event.ports[0];
  port.onmessage = function(event) {
    if (event.data.topic === "talkilla.login") {
      if (!event.data.data || !event.data.data.username) {
        port.postMessage({
          topic: "talkilla.login-failure",
          data: "no username specified"
        });
        return;
      }
    }
  };
}
