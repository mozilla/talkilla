/*global CustomEvent */
/* jshint unused: false */

var browserDetection = (function ($) {
  "use strict";

  var app = {
  };

  app.initialize = function() {
    if (this.isSupportedFirefox()) {
      $('#browser-firefox').show();
      $('#browser-unknown').hide();
    }
    else {
      $('#browser-firefox').hide();
      $('#browser-unknown').show();
    }

    $('.title').text($('.title').text() + this._getHostSpecificText());
  };

  app.isSupportedFirefox = function() {
    var ua = navigator.userAgent.toLowerCase();
    // Unfortunately the only way of detecting Social API with website support
    // to add is by version number.
    var rvStart = ua.indexOf('rv:');
    var rvEnd = ua.indexOf(')', rvStart);
    var rv = parseInt(ua.substring(rvStart + 3, rvEnd), 10);
    return ua.contains('firefox') && rv >= 25;
  };

  app.activateSocial = function(node, data) {
    var baseUrl = location.href.substring(0, location.href.lastIndexOf('/'));

    // If you update this manifest, please also update the functional
    // test manifests.
    data = data || {
      // currently required
      "name": "Talkilla" + this._getHostSpecificText(),
      "iconURL": baseUrl + "/img/talkilla16.png",
      "icon32URL": baseUrl + "/img/talkilla32.png",
      "icon64URL": baseUrl + "/img/talkilla64.png",

      // at least one of these must be defined
      "sidebarURL": baseUrl + "/sidebar.html",
      "workerURL": baseUrl + "/js/worker.js",

      // should be available for display purposes
      "description": "Talkilla Services",
      "author": "Mozilla",
      "homepageURL": "https://wiki.mozilla.org/Talkilla"
    };

    var event = new CustomEvent("ActivateSocialFeature");
    node.setAttribute("data-service", JSON.stringify(data));
    node.dispatchEvent(event);
  };

  /**
   * This function looks to see if we're the main Talkilla site (currently
   * expected to be talkilla.mozillalabs.com) and if we're not, it will return
   * text that can be used to extend a string to specific where the site is.
   *
   * If the hostname is dotted, the function will return the first sub-domain
   * listed, otherwise it will return the whole hostname.
   */
  app._getHostSpecificText = function() {
    var hostname =
      location.hostname.substring(0, location.hostname.indexOf('.'));
    var result = location.hostname;
    if (hostname) {
      // If we're talkilla, no adaption necessary, just get out of here.
      if (hostname === 'talkilla')
        return "";

      if (!parseInt(hostname, 10))
        result = hostname;
    }
    return " (" + result + ")";
  };

  return app;
})(jQuery);
