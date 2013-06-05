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

    it("should add initialize a notifications property", function() {
      var appView = new app.views.AppView();

      expect(appView.notifications).to.be.an.instanceOf(
        app.views.NotificationsView);
    });

    it("should add initialize a login property", function() {
      var appView = new app.views.AppView();

      expect(appView.login).to.be.an.instanceOf(
        app.views.LoginView);
    });

    it("should add initialize a users property", function() {
      var appView = new app.views.AppView();

      expect(appView.users).to.be.an.instanceOf(
        app.views.UsersView);
    });

  });

});
