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

      sandbox.stub(sidebarApp.http, "post");
      sandbox.stub(app.utils, "notifyUI");
    });

    describe("talkilla.spa-connected", function() {

      beforeEach(function() {
        var sidebarApp = new SidebarApp();
        // Skipping events triggered in the constructor
        sidebarApp.port.postEvent.reset();
      });

      it("should set the user presence", function() {
        sidebarApp.port.trigger("talkilla.spa-connected");
        expect(sidebarApp.user.get("presence")).to.equal("connected");
      });


      it("should request that the spa send presence info for other users",
        function() {
          sidebarApp.port.trigger("talkilla.spa-connected");

          sinon.assert.calledOnce(sidebarApp.port.postEvent);
          sinon.assert.calledWithExactly(
            sidebarApp.port.postEvent, "talkilla.presence-request");
        });

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

    describe("signin-requested", function() {

      beforeEach(function() {
        sidebarApp.http.post.restore();
      });

      it("should set the user nick", function() {
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signin");
          callback(null, JSON.stringify({nick: "foo"}));
        });

        sidebarApp.user.trigger("signin-requested", "fake assertion");

        expect(sidebarApp.user.get("nick")).to.equal("foo");
      });

      it("should ask the worker to enable the spa", function() {
        var spec = new app.payloads.SPASpec({
          src: "/js/spa/talkilla_worker.js",
          credentials: {email: "foo"}
        });
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signin");
          callback(null, JSON.stringify({nick: "foo"}));
        });
        sidebarApp.port.postEvent.reset();

        sidebarApp.user.trigger("signin-requested", "fake assertion");

        sinon.assert.calledOnce(sidebarApp.port.postEvent);
        sinon.assert.calledWithExactly(
          sidebarApp.port.postEvent, "talkilla.spa-enable", spec.toJSON());
      });

      it("should logout the user if the signin failed", function() {
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signin");
          callback("error", "");
        });

        sidebarApp.user.trigger("signin-requested", "fake assertion");

        sinon.assert.calledOnce(navigator.id.logout);
      });

      it("should display an error if the signin failed", function() {
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signin");
          callback("fake error", "");
        });

        sidebarApp.user.trigger("signin-requested", "fake assertion");

        sinon.assert.calledOnce(app.utils.notifyUI);
        sinon.assert.calledWith(app.utils.notifyUI, sinon.match("fake error"));
      });

    });

    describe("signout-requested", function() {

      beforeEach(function() {
        sidebarApp.http.post.restore();
      });

      it("should reset users' state", function() {
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signout");
          callback(null, "");
        });

        sidebarApp.user.trigger("signout-requested");

        expect(sidebarApp.user.nick).to.equal(undefined);
        expect(sidebarApp.users.length).to.equal(0);
      });

      it("should logout the user even if the request failed", function() {
        sandbox.stub(sidebarApp.http, "post", function(path, data, callback) {
          expect(path).to.equal("/signout");
          callback("error", "");
        });

        sidebarApp.user.trigger("signout-requested");

        expect(sidebarApp.user.nick).to.equal(undefined);
        expect(sidebarApp.users.length).to.equal(0);
      });

    });

    describe("signout (from user model)", function() {
      it("should clear the user model on signout", function() {
        sandbox.stub(sidebarApp.user, "clear");

        sidebarApp.user.trigger("signout");

        sinon.assert.called(sidebarApp.user.clear);
      });

      it("should reset the users model on signout", function() {
        sandbox.stub(sidebarApp.users, "reset");

        sidebarApp.user.trigger("signout");

        sinon.assert.called(sidebarApp.users.reset);
      });
    });

    describe("talkilla.worker-ready", function() {

      var specs;

      beforeEach(function() {
        specs = [
          new app.payloads.SPASpec({src: "/first-spa", credentials: "cred1"}),
          new app.payloads.SPASpec({src: "/second-spa", credentials: "cred2"})
        ];
        localStorage.setItem("enabled-spa", JSON.stringify(specs));
        sandbox.stub(sidebarApp.services.google, "initialize");
        // Skipping events triggered in the constructor
        sidebarApp.port.postEvent.reset();
      });

      afterEach(function() {
        localStorage.removeItem("enabled-spa");
      });

      it("should initialize the google services", function() {
        sidebarApp.port.trigger("talkilla.worker-ready");

        sinon.assert.calledOnce(sidebarApp.services.google.initialize);
      });

      it("should enable all the SPA", function() {
        sidebarApp.port.trigger("talkilla.worker-ready");

        sinon.assert.calledTwice(sidebarApp.port.postEvent);
        sinon.assert.calledWith(
          sidebarApp.port.postEvent, "talkilla.spa-enable", specs[0].toJSON());
        sinon.assert.calledWith(
          sidebarApp.port.postEvent, "talkilla.spa-enable", specs[1].toJSON());
      });

    });

  });
});
