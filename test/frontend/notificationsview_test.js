/* global app, describe, it, beforeEach, afterEach, sinon */

describe("NotificationsView", function() {
  describe("#initialize", function() {
    var sandbox, notificationsView;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      app.data.user = new app.models.User();
    });

    afterEach(function() {
      notificationsView = undefined;
      sandbox.restore();
    });

    describe("attach", function() {
      beforeEach(function() {
        app.data.user.on = sandbox.spy();
        notificationsView = new app.views.NotificationsView();
      });

      it("should attach to the user model for signin", function() {
        sinon.assert.called(app.data.user.on);
        sinon.assert.calledWith(app.data.user.on, "signin");
      });

      it("should attach to the user model for signin", function() {
        sinon.assert.called(app.data.user.on);
        sinon.assert.calledWith(app.data.user.on, "signout");
      });
    });

    describe("clear", function() {
      beforeEach(function() {
        sandbox.stub(app.views.NotificationsView.prototype, "clear");
        notificationsView = new app.views.NotificationsView();
      });

      it("should clear the NotificationsView on signin", function() {
        app.data.user.trigger('signin');

        sinon.assert.calledOnce(notificationsView.clear);
      });

      it("should clear the NotificationsView on signout", function() {
        app.data.user.trigger('signout');

        sinon.assert.calledOnce(notificationsView.clear);
      });
    });
  });
});
