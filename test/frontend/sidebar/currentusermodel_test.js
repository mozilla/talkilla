/* global sinon, app */
"use strict";

describe("CurrentUser Model", function() {
  var sandbox, browserIdHandlers, currentUser;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // BrowserId "mock"
    window.navigator.id = {
      request: sandbox.spy(),

      watch: function(callbacks) {
        browserIdHandlers = callbacks;
      }
    };

    currentUser = new app.models.CurrentUser();
    sandbox.stub(currentUser, "trigger");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#signout", function() {
    it("should trigger a signout-requested event when signout is called",
      function() {
        currentUser.signout();

        sinon.assert.calledOnce(currentUser.trigger);
        sinon.assert.calledWithExactly(currentUser.trigger,
                                       "signout-requested");
      });
  });
});
