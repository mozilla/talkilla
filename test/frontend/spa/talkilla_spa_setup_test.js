/*global sinon, TalkillaSPASetup, payloads */

describe("TalkillaSPASetup", function() {
  "use strict";

  var sandbox, browserIdHandlers, setup;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // BrowserId mock
    window.navigator.id = {
      watch: function(callbacks) {
        browserIdHandlers = callbacks;
      }
    };
    // loadConfig mock
    window.loadConfig = function() {
      return {ROOTURL: "*"};
    };

    setup = new TalkillaSPASetup();
  });

  describe("browserid signin", function() {

    it("should send a talkilla.spa-enable message via the iframe port",
      function() {
        var spec = new payloads.SPASpec({
          name: "TalkillaSPA",
          src: "/js/spa/talkilla_worker.js",
          credentials: {email: "foo"}
        });
        sandbox.stub(setup.http, "post", function(path, data, callback) {
          callback(null, JSON.stringify({nick: "foo"}));
        });
        sandbox.stub(setup.iframePort, "post");

        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.calledOnce(setup.iframePort.post);
        sinon.assert.calledWithExactly(
          setup.iframePort.post, "talkilla.spa-enable", spec);
      });

  });

});

