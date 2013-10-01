/* global app, chai, sinon, AppPort, SidebarApp */
/* jshint expr:true */
var expect = chai.expect;

describe("SidebarApp", function() {
  "use strict";

  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozSocial "mock"
    window.navigator.mozSocial = {
      getWorker: function() {
        return {port: {}};
      }
    };
    // BrowserId "mock"
    window.navigator.id = {watch: sinon.spy(), logout: sinon.spy()};

    sandbox.stub(app.views, "AppView");
    sandbox.stub(AppPort.prototype, "postEvent");
  });

  afterEach(function() {
    sandbox.restore();
    app.options.DEBUG = false;
  });

  describe("#constructor", function() {
    beforeEach(function() {
      // User prototype methods stubs
      sandbox.stub(app.models.User.prototype, "on");

      // jQuery.cookie stubs
      sandbox.stub(window.jQuery, "removeCookie");
    });

    it("should create an AppView", function() {
      new SidebarApp();

      sinon.assert.calledOnce(app.views.AppView);
    });

    it("should create a port", function() {
      var sidebarApp = new SidebarApp();

      expect(sidebarApp.port).to.be.an.instanceOf(AppPort);
    });

    it("should create a user", function() {
      var sidebarApp = new SidebarApp();

      expect(sidebarApp.user).to.be.an.instanceOf(app.models.User);
    });

    it("should create a user list", function() {
      var sidebarApp = new SidebarApp();

      expect(sidebarApp.users).to.be.an.instanceOf(app.models.UserSet);
    });

    it("should listen to the user model for signout", function() {
      sandbox.stub(AppPort.prototype, "on");

      var sidebarApp = new SidebarApp();

      sinon.assert.called(sidebarApp.user.on);
      sinon.assert.calledWith(sidebarApp.user.on, "signout");
    });

    it("should ask for the presence state on login success", function() {
      var sidebarApp = new SidebarApp();
      var data = {username: "foo"};
      sidebarApp.port.postEvent.reset();

      sidebarApp.port.trigger("talkilla.login-success", data);

      sinon.assert.calledOnce(sidebarApp.port.postEvent);
      sinon.assert.calledWithExactly(
        sidebarApp.port.postEvent, "talkilla.presence-request");
    });

    it("should display an error on login failures", function() {
      var sidebarApp = new SidebarApp();
      var error = "fake login failure";
      sidebarApp.port.postEvent.reset();
      sandbox.stub(app.utils, "notifyUI");

      sidebarApp.port.trigger("talkilla.login-failure", error);

      sinon.assert.calledOnce(app.utils.notifyUI);
      sinon.assert.calledWith(app.utils.notifyUI, sinon.match(error));
      sinon.assert.calledOnce(navigator.id.logout);
    });

    it("should reset user data on logout success", function() {
      var sidebarApp = new SidebarApp();
      sidebarApp.user.set({nick: "jb"});

      sidebarApp.port.trigger("talkilla.logout-success");

      expect(sidebarApp.user.get('nick')).to.be.a("undefined");
    });

    it("should reset the user list on logout success", function() {
      var sidebarApp = new SidebarApp();
      sidebarApp.users.add({nick: "niko"});

      sidebarApp.port.trigger("talkilla.logout-success");

      expect(sidebarApp.users).to.have.length.of(0);
    });

    it("should post talkilla.sidebar-ready to the worker", function() {
      var sidebarApp = new SidebarApp();

      sinon.assert.calledOnce(sidebarApp.port.postEvent);
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.sidebar-ready");
    });

    it("should listen to the `talkilla.debug` event when debug is enabled",
      function() {
        sandbox.stub(AppPort.prototype, "on");
        app.options.DEBUG = true;
        var sidebarApp = new SidebarApp({nick: "toto"});

        sinon.assert.called(sidebarApp.port.on);
        sinon.assert.calledWith(sidebarApp.port.on, "talkilla.debug");
      });

    it("should listen to the `talkilla.users` event and update user list",
      function() {
        var sidebarApp = new SidebarApp();

        sidebarApp.port.trigger("talkilla.users", [
          {nick: "bob"},
          {nick: "bill"}
        ]);

        expect(sidebarApp.users).to.have.length.of(2);
        expect(sidebarApp.users.at(0).get('nick')).to.equal("bob");
        expect(sidebarApp.users.at(1).get('nick')).to.equal("bill");
      });
  });

  describe("Browser Id bindings", function() {

    var browserIdHandlers;

    beforeEach(function() {
      window.navigator.id = {
        watch: function(callbacks) {
          browserIdHandlers = callbacks;
        }
      };
    });

    it("should post a talkilla.login event when the user logs in",
      function() {
        var sidebarApp = new SidebarApp();

        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.called(sidebarApp.port.postEvent, "talkilla.login");
        sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                       "talkilla.login",
                                       {assertion: "fake assertion"});
      });

    it("should not post a talkilla.login event if already logged in",
      function() {
        var sidebarApp = new SidebarApp();
        sidebarApp.user.set("nick", "foo").set("presence", "connected");

        sidebarApp.port.postEvent.reset();
        browserIdHandlers.onlogin("fake assertion");

        sinon.assert.notCalled(sidebarApp.port.postEvent);
      });

    it("should post a talkilla.logout event when the user logs out",
      function() {
        var sidebarApp = new SidebarApp();

        browserIdHandlers.onlogout();

        sinon.assert.called(sidebarApp.port.postEvent, "talkilla.logout");
      });
  });

  describe("#openConversation", function() {
    it("should post the talkilla.conversation-open event", function() {
      var sidebarApp = new SidebarApp();
      sidebarApp.user.set("nick", "toto");

      sidebarApp.openConversation("jb");

      sinon.assert.called(sidebarApp.port.postEvent,
                          "talkilla.conversation-open");
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.conversation-open",
                                     {user: "toto", peer: "jb"});
    });
  });

  describe("events", function() {

    var sidebarApp;

    beforeEach(function() {
      sidebarApp = new SidebarApp();
      sidebarApp.user.set("nick", "toto");

      sandbox.stub(app.utils, "notifyUI");
    });

    describe("talkilla.websocket-error reception", function() {
      it("should call clear() on the user model", function() {
        sandbox.stub(sidebarApp.user, "clear");

        sidebarApp.port.trigger("talkilla.websocket-error");

        sinon.assert.calledOnce(sidebarApp.user.clear);
        sinon.assert.calledWithExactly(sidebarApp.user.clear);
      });


      it("should notify the user of an error", function() {

        sidebarApp.port.trigger("talkilla.websocket-error");

        sinon.assert.calledOnce(app.utils.notifyUI);
        sinon.assert.calledWithExactly(app.utils.notifyUI,
          sinon.match.string, 'error');
      });

    });

  });
});
