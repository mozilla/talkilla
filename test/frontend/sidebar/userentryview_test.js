/*global app, chai, sinon, AppPort */
"use strict";

var expect = chai.expect;

describe("UserEntryView", function() {
  var sandbox, sidebarApp;

  function createFakeSidebarApp() {
    // exposes a global sidebarApp for view consumption
    // XXX: FIX THAT
    window.sidebarApp = {
      user: new app.models.User(),
      appPort: new AppPort()
    };
    return window.sidebarApp;
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozSocial "mock"
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: {postMessage: sinon.spy()}
        };
      }
    };

    sandbox.stub(AppPort.prototype, "post");

    sidebarApp = createFakeSidebarApp();
    sidebarApp.openConversation = sandbox.spy();
  });

  afterEach(function() {
    sandbox.restore();
    window.sidebarApp = undefined;
  });

  describe("#call", function() {
    it("should ask the app to open a new conversation", function () {
      var view = new app.views.UserEntryView();

      var clickEvent = {
        preventDefault: function() {},
        currentTarget: {
          getAttribute: function() {return "william";}
        }
      };

      view.openConversation(clickEvent);

      sinon.assert.calledOnce(sidebarApp.openConversation);
      sinon.assert.calledWith(sidebarApp.openConversation, "william");
    });
  });

  describe("#render", function() {
    var user, view;

    beforeEach(function() {
      user = new app.models.User();
      view = new app.views.UserEntryView({
        model: user,
        el: $("#fixtures")
      });
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    it("should populate template with expected username", function() {
      user.set({username: "chuck"});

      view.render();

      console.log(view.$el.html());

      expect(view.$("a").attr("rel")).eql("chuck");
      expect(view.$("a").attr("title")).eql("chuck");
      expect(view.$(".username").text()).eql("chuck");
    });

    it("should populate template with expected full name", function() {
      user.set({username: "chuck", fullName: "Chuck Norris"});

      view.render();

      console.log(view.$el.html());

      expect(view.$("a").attr("rel")).eql("chuck");
      expect(view.$("a").attr("title")).eql("chuck");
      expect(view.$(".username").text()).eql("Chuck Norris");
    });
  });
});
