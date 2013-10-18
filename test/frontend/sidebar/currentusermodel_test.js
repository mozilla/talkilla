/* global sinon, app */

describe("CurrentUser Model", function() {
  var sandbox, browserIdHandlers, user;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // BrowserId "mock"
    window.navigator.id = {
      request: sandbox.spy(),

      watch: function(callbacks) {
        browserIdHandlers = callbacks;
      }
    };

    user = new app.models.CurrentUser();
    sandbox.stub(user, "trigger");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("browserid signin", function() {
    it("should not post a signin-requested event if the user is already " +
      "logged in", function() {
        user.set({nick: "foo", presence: "connected"});
        user.trigger.reset();

        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.notCalled(user.trigger);
      });

    it("should post a signin-requested event when the user logs in",
      function() {
        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.calledOnce(user.trigger);
        sinon.assert.calledWithExactly(user.trigger,
                                       "signin-requested",
                                       "fake assertion");
      });
  });

  describe("#signin", function() {
    it("should not call navigator.id.request if the user is already logged in",
      function() {
        user.set({nick: "foo", presence: "connected"});

        user.signin();

        sinon.assert.notCalled(navigator.id.request);
      });

    it("should call navigator.id.request",
      function() {
        user.signin();

        sinon.assert.calledOnce(navigator.id.request);
      });
  });

  describe("#signout", function() {
    it("should trigger a signout-requested event when signout is called",
      function() {
        user.signout();

        sinon.assert.calledOnce(user.trigger);
        sinon.assert.calledWithExactly(user.trigger,
                                       "signout-requested");
      });
  });
});
