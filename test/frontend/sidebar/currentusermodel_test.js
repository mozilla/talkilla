/* global sinon, app */

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

  describe("browserid signin", function() {
    it("should not post a signin-requested event if the user is already " +
      "logged in", function() {
        currentUser.set({nick: "foo", presence: "connected"});
        currentUser.trigger.reset();

        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.notCalled(currentUser.trigger);
      });

    it("should post a signin-requested event when the user logs in",
      function() {
        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.calledOnce(currentUser.trigger);
        sinon.assert.calledWithExactly(currentUser.trigger,
                                       "signin-requested",
                                       "fake assertion");
      });
  });

  describe("#signin", function() {
    it("should not call navigator.id.request if the user is already logged in",
      function() {
        currentUser.set({nick: "foo", presence: "connected"});

        currentUser.signin();

        sinon.assert.notCalled(navigator.id.request);
      });

    it("should call navigator.id.request",
      function() {
        currentUser.signin();

        sinon.assert.calledOnce(navigator.id.request);
      });
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
