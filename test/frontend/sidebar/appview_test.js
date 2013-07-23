/* global app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("AppView", function() {
  var sandbox;

  describe("#initialize", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      sandbox.stub(app.views, "NotificationsView");
      sandbox.stub(app.views, "LoginView");
      sandbox.stub(app.views, "UsersView");
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("required parameters", function() {
      it("should require a user parameter", function() {
        expect(function() {
          new app.views.AppView({users: []});
        }).to.Throw(Error);
      });

      it("should require a users parameter", function() {
        expect(function() {
          new app.views.AppView({user: {}});
        }).to.Throw(Error);
      });
    });

    describe("constructed properties", function() {
      var appView;

      beforeEach(function() {
        appView = new app.views.AppView({user: {}, users: []});
      });

      it("should add initialize a notifications property", function() {
        expect(appView.notifications).to.be.an.instanceOf(
          app.views.NotificationsView);
      });

      it("should add initialize a login property", function() {
        expect(appView.login).to.be.an.instanceOf(app.views.LoginView);
      });

      it("should add initialize a users property", function() {
        expect(appView.users).to.be.an.instanceOf(app.views.UsersView);
      });
    });
  });
});
