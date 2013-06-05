/* global app, chai, describe, it, beforeEach, afterEach, sinon, SidebarApp */
/* jshint expr:true */
var expect = chai.expect;

describe("App", function() {
  it("should exist", function() {
    expect(app).to.exist;
  });

});

describe("SidebarApp", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    app.data.user = new app.models.User();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#constructor", function() {
    beforeEach(function() {
      sandbox.stub(app.views, "AppView");
      app.data.user.on = sandbox.spy();
    });

    it("should create an AppView", function() {
      new SidebarApp();

      sinon.assert.calledOnce(app.views.AppView);
    });

    it("should listen to the user model for signout", function() {
      new SidebarApp();

      sinon.assert.calledOnce(app.data.user.on);
      sinon.assert.calledWith(app.data.user.on, "signout");
    });

    it("should reset all data apart from user data on signout", function() {
      app.data.user.clear = sandbox.spy();

      // Save the current user data.
      var userData = app.data.user;

      // Add some extra data.
      app.data.random = true;

      // Create the app and call the signout callback function.
      new SidebarApp();
      app.data.user.on.args[0][1]();

      expect(app.data).to.deep.equal({user: userData});
    });
  });
});
