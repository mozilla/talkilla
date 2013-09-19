/* global DummyWorker, BackboneEvents */
/* jshint unused:false */

var SPAPort = (function(globalScope) {
  function Port() {
    globalScope.onmessage = this._onMessage.bind(this);
  }

  BackboneEvents.mixin(Port.prototype);

  Port.prototype.post = function(topic, data) {
    globalScope.postMessage({topic: topic, data: data});
  };

  Port.prototype._onMessage = function(event) {
    this.trigger(event.topic, event.data);
  };

  return Port;
}(this));
