/* global app, chai, sinon, AppPort, SidebarApp */
/* jshint expr:true */
"use strict";

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
    sandbox.stub(AppPort.prototype, "post");
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

    it("should initialize an AppView with isInSidebar set to true if the" +
      " location query string is a sidebar parameter", function() {

      new SidebarApp({location: "http://example.com/?sidebar"});

      sinon.assert.calledOnce(app.views.AppView);
      sinon.assert.calledWithExactly(app.views.AppView,
        sinon.match.has("isInSidebar", true));
    });

    it("should initialize an AppView with isInSidebar set to false if the" +
      " location query string is not a sidebar parameter", function() {

      new SidebarApp({location: "http://example.com/"});

      sinon.assert.calledOnce(app.views.AppView);
      sinon.assert.calledWithExactly(app.views.AppView,
        sinon.match.has("isInSidebar", false));
    });

    it("should create an AppPort", function() {
      var sidebarApp = new SidebarApp();

      expect(sidebarApp.appPort).to.be.an.instanceOf(AppPort);
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

      sinon.assert.calledOnce(sidebarApp.appPort.post);
      sinon.assert.calledWithExactly(sidebarApp.appPort.post,
                                     "talkilla.sidebar-ready");
    });

    it("should listen to the `talkilla.debug` event when debug is enabled",
      function() {
        sandbox.stub(AppPort.prototype, "on");
        app.options.DEBUG = true;
        var sidebarApp = new SidebarApp({username: "toto"});

        sinon.assert.called(sidebarApp.appPort.on);
        sinon.assert.calledWith(sidebarApp.appPort.on, "talkilla.debug");
      });

    it("should listen to the `talkilla.users` event and update user list",
      function() {
        var sidebarApp = new SidebarApp();

        sidebarApp.appPort.trigger("talkilla.users", [
          {username: "bob"},
          {username: "bill"}
        ]);

        expect(sidebarApp.users).to.have.length.of(2);
        expect(sidebarApp.users.at(0).get('username')).to.equal("bill");
        expect(sidebarApp.users.at(1).get('username')).to.equal("bob");
      });
  });

  describe("#openConversation", function() {
    it("should post the talkilla.conversation-open event", function() {
      var sidebarApp = new SidebarApp();

      sidebarApp.openConversation("jb");

      sinon.assert.called(sidebarApp.appPort.post,
                          "talkilla.conversation-open");
      sinon.assert.calledWithExactly(sidebarApp.appPort.post,
                                     "talkilla.conversation-open",
                                     {peer: "jb"});
    });
  });

  describe("events", function() {

    var sidebarApp;

    beforeEach(function() {
      sidebarApp = new SidebarApp();
      sidebarApp.user.set("username", "toto");

      sandbox.stub(sidebarApp.http, "post");
      sandbox.stub(app.utils, "notifyUI");
    });

    describe("talkilla.spa-connected", function() {
      beforeEach(function() {
        var sidebarApp = new SidebarApp();
        // Skipping events triggered in the constructor
        sidebarApp.appPort.post.reset();
      });

      it("should set the user presence", function() {
        sidebarApp.appPort.trigger("talkilla.spa-connected");

        expect(sidebarApp.user.get("presence")).to.equal("connected");
      });

      it("should set the SPA capabilities", function() {
        var capabilities = ["call", "move"];

        sidebarApp.appPort.trigger("talkilla.spa-connected",
                                   {capabilities: capabilities});

        expect(sidebarApp.spa.get("capabilities")).eql(capabilities);
      });
    });

    describe("talkilla.spa-error", function() {

      it("should call clear() on the user model", function() {
        sandbox.stub(sidebarApp.user, "clear");

        sidebarApp.appPort.trigger("talkilla.spa-error");

        sinon.assert.calledOnce(sidebarApp.user.clear);
        sinon.assert.calledWithExactly(sidebarApp.user.clear);
      });


      it("should notify the user of an error", function() {
        sidebarApp.appPort.trigger("talkilla.spa-error");

        sinon.assert.calledOnce(app.utils.notifyUI);
        sinon.assert.calledWithExactly(app.utils.notifyUI,
          sinon.match.string, 'error');
      });

    });

    describe("signout-requested", function() {

      beforeEach(function() {
        sidebarApp.appPort.post.reset();
      });

      it("should reset users' state", function() {
        sidebarApp.user.trigger("signout-requested");

        expect(sidebarApp.user.username).to.equal(undefined);
        expect(sidebarApp.users.length).to.equal(0);
      });

      it("should ask the SPA to forget credentials", function() {
        sidebarApp.user.trigger("signout-requested");

        sinon.assert.calledTwice(sidebarApp.appPort.post);
        sinon.assert.calledWithExactly(sidebarApp.appPort.post,
                                       "talkilla.spa-forget-credentials",
                                       "TalkillaSPA");
      });

      it("should disable the SPA", function() {
        sidebarApp.user.trigger("signout-requested");

        sinon.assert.calledTwice(sidebarApp.appPort.post);
        sinon.assert.calledWithExactly(
          sidebarApp.appPort.post, "talkilla.spa-disable", "TalkillaSPA");
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

      beforeEach(function() {
        sandbox.stub(sidebarApp.services.google, "initialize");
      });

      it("should initialize the google services", function() {
        sidebarApp.appPort.trigger("talkilla.worker-ready");

        sinon.assert.calledOnce(sidebarApp.services.google.initialize);
      });

    });

    describe("social.user-profile", function() {

      it("should set the user's username", function() {
        var userData = {
          iconURL: "fake icon url",
          portrait: "fake portrait",
          userName: "foo",
          displayName: "fake display name",
          profileURL: "fake profile url"
        };

        sidebarApp.appPort.trigger("social.user-profile", userData);

        expect(sidebarApp.user.get("username")).to.equal("foo");
      });

    });

    describe("SPA `dial` event", function() {
      it("should open a conversation passing dialed number", function() {
        sidebarApp.spa.trigger("dial", "123");

        sinon.assert.called(sidebarApp.appPort.post,
                            "talkilla.conversation-open");
        sinon.assert.calledWithExactly(sidebarApp.appPort.post,
                                       "talkilla.conversation-open",
                                       {peer: "123"});
      });
    });

  });
});
