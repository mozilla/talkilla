/* global Backbone, _ */
/**
 * Social API Worker Port wrapper & message events listener/dispatcher.
 */
(function(exports, Backbone, _) {
  "use strict";

  function AppPort() {
    this._port = navigator.mozSocial.getWorker().port;

    this._port.onmessage = function(event) {
      this.trigger(event.data.topic, event.data.data);
    }.bind(this);
  }
  exports.AppPort = AppPort;

  AppPort.prototype.postEvent = function(topic, data) {
    this._port.postMessage({topic: topic, data: data});
  };

  _.extend(AppPort.prototype, Backbone.Events);
})(this, Backbone, _);
