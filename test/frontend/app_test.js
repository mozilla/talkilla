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
    sandbox.stub(app.port, "postEvent");
    app.data.user = new app.models.User();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#constructor", function() {
    var userData;

    beforeEach(function() {
      sandbox.stub(app.views, "AppView");
      userData = app.data.user;
      userData.on = sandbox.spy();
    });

    it("should create an AppView", function() {
      new SidebarApp();

      sinon.assert.calledOnce(app.views.AppView);
    });

    it("should listen to the user model for signout", function() {
      new SidebarApp();

      sinon.assert.calledOnce(userData.on);
      sinon.assert.calledWith(userData.on, "signout");
    });

    it("should reset all data apart from user data on signout", function() {
      userData.clear = sandbox.spy();

      // Save the current user data.
      var savedUserData = userData;

      // Add some extra data.
      app.data.random = true;

      // Create the app and call the signout callback function.
      new SidebarApp();
      userData.on.args[0][1]();

      expect(app.data).to.deep.equal({user: savedUserData});
    });

    it("should post talkilla.sidebar-ready to the worker", function() {
      new SidebarApp({nick: "toto"});

      sinon.assert.calledOnce(app.port.postEvent);
      sinon.assert.calledWithExactly(app.port.postEvent,
                                     "talkilla.sidebar-ready", {nick: "toto"});
    });
  });
});
