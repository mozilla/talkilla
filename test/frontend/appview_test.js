/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("AppView", function() {
  var sandbox;

  describe("#initialize", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      sandbox.stub(app.views, "NotificationsView");
      sandbox.stub(app.views, "LoginView");
      sandbox.stub(app.views, "UsersView");
      sandbox.stub(app.views, "CallView");
      sandbox.stub(app.models, "Call");
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should add initialize a call property", function() {
      var appView = new app.views.AppView();

      expect(appView.call).to.be.an.instanceOf(app.views.CallView);
    });

  });

});
