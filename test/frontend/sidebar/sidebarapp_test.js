/* global app, chai, describe, it, beforeEach, afterEach, sinon, Port,
          SidebarApp */
/* jshint expr:true */
var expect = chai.expect;

describe("SidebarApp", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Port.prototype, "postEvent");
  });

  afterEach(function() {
    sandbox.restore();
    app.options.DEBUG = false;
  });

  describe("#constructor", function() {
    beforeEach(function() {
      sandbox.stub(app.views, "AppView");

      // User prototype methods stubs
      sandbox.stub(app.models.User.prototype, "on");

      // mozSocial "mock"
      window.navigator.mozSocial = {
        getWorker: function() {
          return {port: {}};
        }
      };

      // jQuery.cookie stubs
      sandbox.stub(window.jQuery, "removeCookie");
    });

    it("should create an AppView", function() {
      new SidebarApp();

      sinon.assert.calledOnce(app.views.AppView);
    });

    it("should create a port", function() {
      var sidebarApp = new SidebarApp();

      expect(sidebarApp.port).to.be.an.instanceOf(Port);
    });

    it("should listen to the user model for signout", function() {
      sandbox.stub(Port.prototype, "on");

      var sidebarApp = new SidebarApp();

      sinon.assert.called(sidebarApp.user.on);
      sinon.assert.calledWith(sidebarApp.user.on, "signout");
    });

    it("should reset user data on signout", function() {
      var sidebarApp = new SidebarApp();
      sidebarApp.user.set({nick: "jb"});

      sidebarApp.port.trigger("talkilla.logout-success");

      expect(sidebarApp.user.get('nick')).to.be.a("undefined");
    });

    it("should post talkilla.sidebar-ready to the worker", function() {
      var sidebarApp = new SidebarApp({nick: "toto"});

      sinon.assert.calledOnce(sidebarApp.port.postEvent);
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.sidebar-ready", {nick: "toto"});
    });

    it("should listen to the `talkilla.debug` event when debug is enabled",
      function() {
        sandbox.stub(Port.prototype, "on");
        app.options.DEBUG = true;
        var sidebarApp = new SidebarApp({nick: "toto"});

        sinon.assert.called(sidebarApp.port.on);
        sinon.assert.calledWith(sidebarApp.port.on, "talkilla.debug");
      });
  });
});
