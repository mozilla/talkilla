/* global jQuery, CustomEvent */
/* jshint unused: false */

var browserDetection = (function ($) {
  "use strict";

  var app = {
    loc: location.href,
    baseUrl: location.href.substring(0, location.href.lastIndexOf('/'))
  };

  app.initialize = function() {
    if (this.isSupportedFirefox()) {
      $('#browser-firefox').show();
      $('#browser-unknown').hide();
    }
  };

  app.isSupportedFirefox = function() {
    var ua = navigator.userAgent.toLowerCase();
    // Unfortunately the only way of detecting Social API with website support
    // to add is by version number.
    var rvStart = ua.indexOf('rv:');
    var rvEnd = ua.indexOf(')', rvStart);
    var rv = parseInt(ua.substring(rvStart + 3, rvEnd), 10);
    return ua.contains('firefox') && rv > 23;
  };

  app.activateSocial = function(node, data) {
    data = data || {
      // currently required
      "name": "Talkilla",
      "iconURL": this.baseUrl + "/talkilla16.png",
      "icon32URL": this.baseUrl + "/talkilla32.png",
      "icon64URL": this.baseUrl + "/talkilla64.png",

      // at least one of these must be defined
      "sidebarURL": this.baseUrl + "/sidebar.html",

      // should be available for display purposes
      "description": "Talkilla Services",
      "author": "Mozilla",
      "homepageURL": "https://wiki.mozilla.org/Talkilla"
    };

    var event = new CustomEvent("ActivateSocialFeature");
    node.setAttribute("data-service", JSON.stringify(data));
    node.dispatchEvent(event);
  };

  return app;
})(jQuery);
