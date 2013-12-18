/* jshint unused:false */

var SPAChannel = (function() {
  "use strict";

  function SPAChannel(appPort) {
    this.appPort = appPort;
    this.appPort.on("talkilla.spa-channel-message",
                    this.trigger.bind(this, "message"));
  }

  _.extend(SPAChannel.prototype, Backbone.Events);

  /**
   * Sends data over data channel.
   * @param  {Object} data
   * @public
   */
  SPAChannel.prototype.send = function(data) {
    this.appPort.post("talkilla.spa-channel-message", data);
  };

  return SPAChannel;
}());