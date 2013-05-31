/* global app, Backbone, _, jQuery*/
/**
 * Talkilla Backbone views.
 */
/* jshint unused: vars */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * Global app view.
   */
  app.views.CallView = Backbone.View.extend({

    initialize: function(options) {
      options = options || {};
      if (!options.webrtc)
        throw Error("missing parameter: webrtc");
      if (!options.el)
        throw Error("missing parameter: el");

      this.webrtc = options.webrtc;
      this.webrtc.on('change:localStream', this._displayLocalVideo, this);
      this.webrtc.on('change:remoteStream', this._displayRemoteVideo, this);
    },

    _displayLocalVideo: function() {
      var localVideo = this.$('#local-video')[0];
      var localStream = this.webrtc.get("localStream");
      localVideo.mozSrcObject = localStream;
      return this;
    },

    _displayRemoteVideo: function() {
      var remoteVideo = this.$('#remote-video')[0];
      var remoteStream = this.webrtc.get("remoteStream");

      remoteVideo.mozSrcObject = remoteStream;
      return this;
    }
  });
})(app, Backbone, _, jQuery);
