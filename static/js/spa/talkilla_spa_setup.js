/*global HTTP, payloads */
/* jshint unused: false */

var TalkillaSPASetup = (function(globalScope) {
  "use strict";

  function IframePort() {
    var config = globalScope.loadConfig();
    this.allowedTargetOrigins = config.ROOTURL;
  }

  IframePort.prototype = {
    post: function(topic, data) {
      var message = JSON.stringify({topic: topic, data: data});
      globalScope.parent.postMessage(message, this.allowedTargetOrigins);
    }
  };

  function TalkillaSPASetup() {
    this.http = new HTTP();
    this.iframePort = new IframePort();

    navigator.id.watch({
      onlogin: this._onSignin.bind(this)
    });
  }

  TalkillaSPASetup.prototype = {
    _onSignin: function(assertion) {
      var assertionData = {assertion: assertion};
      this.http.post("/signin", assertionData, function(err, response) {
        // XXX: we have to handle errors
        this._onLoginSuccess(JSON.parse(response));
      }.bind(this));
    },

    _onLoginSuccess: function(loginData) {
      var talkillaSpec = new payloads.SPASpec({
        name: "TalkillaSPA",
        src: "/js/spa/talkilla_worker.js",
        credentials: {email: loginData.nick}
      });

      this.iframePort.post("talkilla.spa-enable", talkillaSpec);
    }
  };

  return TalkillaSPASetup;
}(window));

