/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("AppView", function() {
  var sandbox;

  describe("#initialize", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      sandbox.stub(app.views, "NotificationsView");
      sandbox.stub(app.views, "LoginView");
      sandbox.stub(app.views, "UsersView");
      sandbox.stub(app.views, "ImportContactsView");
      sandbox.stub(app.views, "SPAView");
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("required parameters", function() {
      it("should require an appStatus parameter", function() {
        expect(function() {
          new app.views.AppView({users: [], user: []});
        }).to.Throw(/appStatus/);
      });

      it("should require a user parameter", function() {
        expect(function() {
          new app.views.AppView({users: [], appStatus: []});
        }).to.Throw(/user/);
      });

      it("should require a users parameter", function() {
        expect(function() {
          new app.views.AppView({user: {}, appStatus: []});
        }).to.Throw(/users/);
      });

      it("should require a spa parameter", function() {
        expect(function() {
          new app.views.AppView({user: {}, users: {}, appStatus: []});
        }).to.Throw(/spa/);
      });
    });

    describe("constructed properties", function() {
      var appView;

      beforeEach(function() {
        appView = new app.views.AppView({
          user: {},
          users: [],
          appStatus: [],
          spa: {}
        });
      });

      it("should set a notifications property", function() {
        expect(appView.notifications).to.be.an.instanceOf(
          app.views.NotificationsView);
      });

      it("should set a login property", function() {
        expect(appView.login).to.be.an.instanceOf(app.views.LoginView);
      });

      it("should set a users property", function() {
        expect(appView.users).to.be.an.instanceOf(app.views.UsersView);
      });

      it("should set an spa property", function() {
        expect(appView.spa).to.be.an.instanceOf(app.views.SPAView);
      });
    });
  });
});
