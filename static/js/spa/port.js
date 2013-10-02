/* global DummyWorker, BackboneEvents */
/* jshint unused:false */

var SPAPort = (function(globalScope) {
  function Port() {
    globalScope.onmessage = this._onMessage.bind(this);
  }

  Port.prototype = {
    post: function(topic, data) {
      globalScope.postMessage({topic: topic, data: data});
    },

    _onMessage: function(event) {
      this.trigger(event.topic, event.data);
    }
  };

  BackboneEvents.mixin(Port.prototype);

  return Port;
}(this));
