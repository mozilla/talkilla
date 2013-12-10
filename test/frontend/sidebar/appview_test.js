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

    describe("constructed properties", function() {
      var appView;

      beforeEach(function() {
        appView = new app.views.AppView({
          user: new app.models.CurrentUser(),
          users: new app.models.UserSet(),
          appStatus: new app.models.AppStatus(),
          spa: new app.models.SPA(),
          services: {}
        });
      });

      it("should set a notifications property", function() {
        expect(appView.notificationsView).to.be.an.instanceOf(
          app.views.NotificationsView);
      });

      it("should set a login property", function() {
        expect(appView.loginView).to.be.an.instanceOf(app.views.LoginView);
      });

      it("should set a users property", function() {
        expect(appView.usersView).to.be.an.instanceOf(app.views.UsersView);
      });

      it("should set an spa property", function() {
        expect(appView.spaView).to.be.an.instanceOf(app.views.SPAView);
      });
    });
  });
});
