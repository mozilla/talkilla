/* global app, describe, it, beforeEach, afterEach, sinon, Port */

describe("NotificationsView", function() {

  function createFakeSidebarApp() {
    // exposes a global sidebarApp for view consumption
    // XXX: FIX THAT
    window.sidebarApp = {
      user: new app.models.User(),
      port: new Port()
    };
    return window.sidebarApp;
  }

  describe("#initialize", function() {
    var sandbox, user, notificationsView;

    beforeEach(function() {
      // mozSocial "mock"
      navigator.mozSocial = {
        getWorker: function() {
          return {
            port: {postMessage: sinon.spy()}
          };
        }
      };

      sandbox = sinon.sandbox.create();
      user = app.data.user = new app.models.User();
    });

    afterEach(function() {
      notificationsView = undefined;
      sandbox.restore();
      window.sidebarApp = undefined;
    });

    describe("events listeners", function() {
      it("should listen to the `talkilla.offer-timeout` port event",
        function() {
          sandbox.stub(Port.prototype, "on");
          var sidebarApp = createFakeSidebarApp();

          new app.views.NotificationsView();

          sinon.assert.calledOnce(sidebarApp.port.on);
          sinon.assert.calledWith(sidebarApp.port.on, "talkilla.offer-timeout");
        });

      it("should add a notification when the `talkilla.offer-timeout` port " +
         "event is received",
        function() {
          var sidebarApp = createFakeSidebarApp();
          var notify = sinon.stub(app.utils, "notifyUI");
          new app.views.NotificationsView();

          sidebarApp.port.trigger("talkilla.offer-timeout", {peer: "jb"});

          sinon.assert.calledOnce(notify);
          sinon.assert.calledWithExactly(notify,
            "The other party, jb, did not respond", "error");
        });
    });

    describe("attach", function() {
      var sidebarApp;

      beforeEach(function() {
        sandbox.stub(app.models.User.prototype, "on");
        sidebarApp = createFakeSidebarApp();
        notificationsView = new app.views.NotificationsView();
      });

      it("should attach to the user model for signin/signout", function() {
        sinon.assert.called(sidebarApp.user.on);
        sinon.assert.calledWith(sidebarApp.user.on, "signin signout");
      });
    });

    describe("clear", function() {
      var sidebarApp;

      beforeEach(function() {
        sidebarApp = createFakeSidebarApp();
        sandbox.stub(app.views.NotificationsView.prototype, "clear");
        notificationsView = new app.views.NotificationsView();
      });

      it("should clear the NotificationsView on signin", function() {
        sidebarApp.user.trigger('signin');

        sinon.assert.calledOnce(notificationsView.clear);
      });

      it("should clear the NotificationsView on signout", function() {
        sidebarApp.user.trigger('signout');

        sinon.assert.calledOnce(notificationsView.clear);
      });
    });
  });
});
