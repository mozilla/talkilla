/* jshint unused: false */
var RTC = (function(navigator) {
  "use strict";
  var getUserMedia = (navigator.getUserMedia ||
                      navigator.mozGetUserMedia ||
                      navigator.webkitGetUserMedia ||
                      navigator.msGetUserMedia);
  return {
    check: function() {
      return typeof getUserMedia === 'function';
    },

    getUserMedia: function(settings, onSuccess, onError) {
      var self = this;
      return getUserMedia.call(navigator, settings, function(stream) {
        onSuccess.call(navigator, self.mapStream(stream));
      }, onError);
    },

    mapStream: function(stream) {
      if (window.webkitURL)
        return window.webkitURL.createObjectURL(stream);
      return stream; // Opera and Firefox
    }
  };
})(window.navigator);
