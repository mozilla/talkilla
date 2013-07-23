/* global app, chai, describe, it, beforeEach, afterEach, sinon, AppPort,
          SidebarApp */
/* jshint expr:true */
var expect = chai.expect;

describe("SidebarApp", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozSocial "mock"
    window.navigator.mozSocial = {
      getWorker: function() {
        return {port: {}};
      }
    };

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
      var sidebarApp = new SidebarApp({nick: "toto"});

      sinon.assert.calledOnce(sidebarApp.port.postEvent);
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.sidebar-ready", {nick: "toto"});
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

    it("should listen to the `talkilla.offer-timeout` port event",
      function() {
        sandbox.stub(AppPort.prototype, "on");
        var sidebarApp = new SidebarApp();

        new app.views.NotificationsView({user: sidebarApp.user});

        sinon.assert.called(sidebarApp.port.on);
        sinon.assert.calledWith(sidebarApp.port.on, "talkilla.offer-timeout");
      });

    it("should add a notification when the `talkilla.offer-timeout` port " +
       "event is received",
      function() {
        var notify = sandbox.stub(app.utils, "notifyUI");
        var sidebarApp = new SidebarApp();
        new app.views.NotificationsView({user: sidebarApp.user});

        sidebarApp.port.trigger("talkilla.offer-timeout", {peer: "jb"});

        sinon.assert.calledOnce(notify);
        sinon.assert.calledWithExactly(notify,
          "The other party, jb, did not respond", "error");
      });

  });

  describe("#login", function() {
    it("should post the talkilla.login event with user's nick", function() {
      var sidebarApp = new SidebarApp();

      sidebarApp.login("toto");

      sinon.assert.called(sidebarApp.port.postEvent, "talkilla.login");
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.login", {username: "toto"});
    });
  });

  describe("#logout", function() {
    it("should post the talkilla.logout event", function() {
      var sidebarApp = new SidebarApp();

      sidebarApp.logout();

      sinon.assert.called(sidebarApp.port.postEvent, "talkilla.logout");
    });
  });

  describe("#openConversation", function() {
    it("should post the talkilla.conversation-open event", function() {
      var sidebarApp = new SidebarApp({nick: "toto"});

      sidebarApp.openConversation("jb");

      sinon.assert.called(sidebarApp.port.postEvent,
                          "talkilla.conversation-open");
      sinon.assert.calledWithExactly(sidebarApp.port.postEvent,
                                     "talkilla.conversation-open",
                                     {user: "toto", peer: "jb"});
    });
  });
});
