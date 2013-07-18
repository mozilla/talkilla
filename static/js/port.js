/* global Backbone, _ */
/**
 * Social API Worker Port wrapper & message events listener/dispatcher.
 */
(function(exports, Backbone, _) {
  "use strict";

  function Port() {
    this._port = navigator.mozSocial.getWorker().port;

    this._port.onmessage = function(event) {
      this.trigger(event.data.topic, event.data.data);
    }.bind(this);
  }
  exports.Port = Port;

  Port.prototype.postEvent = function(topic, data) {
    this._port.postMessage({topic: topic, data: data});
  };

  _.extend(Port.prototype, Backbone.Events);
})(this, Backbone, _);
