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

    describe("events listeners", function() {
      beforeEach(function() {
        sandbox.stub(app.port, "on");
      });

      it("should listen to the `talkilla.offer-timeout` port event",
        function() {
          new app.views.NotificationsView();

          sinon.assert.calledOnce(app.port.on);
          sinon.assert.calledWith(app.port.on, "talkilla.offer-timeout");
        });

      it("should add a notification when the `talkilla.offer-timeout` port " +
         "event is received",
        function() {
          var notify = sinon.stub(app.utils, "notifyUI");
          new app.views.NotificationsView();

          app.port.on.args[0][1]({other: "jb"});

          sinon.assert.calledOnce(notify);
          sinon.assert.calledWithExactly(notify,
            "The other party, jb, did not respond", "error");
        });
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
