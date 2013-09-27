/* global SPAPort, Server, TalkillaSPA */
/* jshint unused:false */

var DummyWorker = (function(globalScope) {
  importScripts('spa/port.js', 'spa/server.js', 'spa/talkilla_spa.js');

  var port = new SPAPort();
  var server = new Server();
  var spa = new TalkillaSPA(port, server);

  function DummyWorker() {
    port.post = function(topic, data) {
      this.onmessage({topic: topic, data: data});
    }.bind(this);
  }

  DummyWorker.prototype.postMessage = function(event) {
    port.trigger(event.topic, event.data);
  };

  return DummyWorker;
}(this));