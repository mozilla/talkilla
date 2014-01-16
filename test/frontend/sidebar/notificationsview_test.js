/*global app, sinon, chai */
"use strict";

var expect = chai.expect;

describe("NotificationsView", function() {
  var sandbox, user, view, clock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
    sandbox.stub(app.utils, "notifyUI");

    user = new app.models.CurrentUser();
    view = new app.views.NotificationsView({
      user: user,
      appStatus: new app.models.AppStatus()
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#clear", function() {

    beforeEach(function() {
      sandbox.stub(app.views.NotificationsView.prototype, "clear");
      view = new app.views.NotificationsView({
        user: user,
        appStatus: new app.models.AppStatus()
      });
    });

    it("should clear the NotificationsView on signin", function() {
      user.trigger('signin');

      sinon.assert.calledOnce(view.clear);
    });

    it("should clear the NotificationsView on signout", function() {
      user.trigger('signout');

      sinon.assert.calledOnce(view.clear);
    });
  });

  describe("#addNotification", function() {
    it("should clear the notification after some time if timeout is set",
      function() {
        var notification = new app.views.NotificationView({
          model: new app.models.Notification({
            timeout: 42
          })
        });
        sandbox.stub(notification, "clear");
        view.addNotification(notification);
        clock.tick(43);

        sinon.assert.calledOnce(notification.clear);
      });
  });

  describe("AppStatus model events", function() {
    beforeEach(function() {
      sandbox.stub(view, "clear");
    });

    it("should notify the UI if 'reconnecting' is set", function() {
      view.appStatus.set("reconnecting", {timeout: 42, attempt: 2});

      sinon.assert.calledOnce(app.utils.notifyUI);
      sinon.assert.calledWithMatch(app.utils.notifyUI, /0\.042s/,
                                   "error", 42);
    });

    it("should not notify the UI on 'reconnecting' is false",
      function() {
      view.appStatus.set("reconnecting", false);

      sinon.assert.notCalled(app.utils.notifyUI);
    });

    it("should not call clear() nor notify the UI on 'connected' != true",
      function() {
      view.appStatus.set("connected", false);
      sinon.assert.notCalled(view.clear);
      sinon.assert.notCalled(app.utils.notifyUI);
    });

    describe("AppStatus.connected == true", function() {

      it("should reinitialize the AppStatus model",
        function() {
        view.appStatus.set("connected", true);
        expect(view.appStatus.get("reconnecting")).to.eql(false);
        expect(view.appStatus.get("firstReconnection")).to.eql(undefined);
      });

      it("should notify the UI", function() {
        view.appStatus.set("connected", true);
        sinon.assert.calledOnce(app.utils.notifyUI);
        sinon.assert.calledWithMatch(app.utils.notifyUI, /Reconnected/,
                                     "success", 2000);
      });

      it("should call clear()", function() {
        view.appStatus.set("connected", true);
        sinon.assert.calledOnce(view.clear);
        sinon.assert.calledWithExactly(view.clear);
      });

    });
  });
});
