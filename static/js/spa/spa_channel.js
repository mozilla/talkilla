/* jshint unused:false */

var SPAChannel = (function() {
  "use strict";

  /**
   * SPAChannel object constructor.
   *
   * @param {appPort} appPort: the port of an application
   * @param {String}  peer:    the peer to send the data to
   */
  function SPAChannel(appPort, peer) {
    this.peer = peer;
    this.appPort = appPort;
    this.appPort.on("talkilla.spa-channel-message",
                    this.trigger.bind(this, "message"));
  }

  _.extend(SPAChannel.prototype, Backbone.Events);

  /**
   * Sends data to the SPA to be forwarded to the peer. The given data
   * will be automatically "augmented" with a peer attribute to be
   * routed correctly.
   *
   * @param  {Object} data arbitrary object
   * @public
   */
  SPAChannel.prototype.send = function(data) {
    data.peer = this.peer;
    this.appPort.post("talkilla.spa-channel-message", data);
  };

  return SPAChannel;
}());

