/* global BackboneEvents */
/* jshint unused:false */

var SPAPort = (function(globalScope) {
  "use strict";

  function Port() {
    globalScope.onmessage = this._onMessage.bind(this);
  }

  Port.prototype = {
    post: function(topic, data) {
      globalScope.postMessage({topic: topic, data: data});
    },

    _onMessage: function(event) {
      this.trigger(event.data.topic, event.data.data);
    }
  };

  BackboneEvents.mixin(Port.prototype);

  return Port;
}(this));
