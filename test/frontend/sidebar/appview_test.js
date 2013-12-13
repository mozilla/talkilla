/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("AppView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    sandbox.stub(app.views, "NotificationsView");
    sandbox.stub(app.views, "LoginView");
    sandbox.stub(app.views, "UsersView");
    sandbox.stub(app.views, "ImportContactsView");
    sandbox.stub(app.views, "SPAView");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {

    describe("required parameters", function() {
      it("should require an appStatus parameter", function() {
        expect(function() {
          new app.views.AppView({users: [], user: []});
        }).to.Throw(/appStatus/);
      });

      it("should require a user parameter", function() {
        expect(function() {
          new app.views.AppView({users: [], appStatus: []});
        }).to.Throw(/user/);
      });

      it("should require a users parameter", function() {
        expect(function() {
          new app.views.AppView({user: {}, appStatus: []});
        }).to.Throw(/users/);
      });

      it("should require a spa parameter", function() {
        expect(function() {
          new app.views.AppView({user: {}, users: {}, appStatus: []});
        }).to.Throw(/spa/);
      });
    });

    describe("constructed properties", function() {
      var appView, appViewOptions;

      beforeEach(function() {
        var $el = $("<div></div>");
        $("#fixtures").append($el);
        appViewOptions =           {
          el: $el.get()[0],
          user: {},
          users: [],
          appStatus: [],
          spa: {}
        };

      });

      afterEach(function() {
        $("#fixtures").empty();
      });

      it("should set a notifications property", function() {
        appView = new app.views.AppView(appViewOptions);

        expect(appView.notifications).to.be.an.instanceOf(
          app.views.NotificationsView);
      });

      it("should set a login property", function() {
        appView = new app.views.AppView(appViewOptions);

        expect(appView.login).to.be.an.instanceOf(app.views.LoginView);
      });

      it("should set a users property", function() {
        appView = new app.views.AppView(appViewOptions);

        expect(appView.users).to.be.an.instanceOf(app.views.UsersView);
      });

      it("should set an spa property", function() {
        appView = new app.views.AppView(appViewOptions);

        expect(appView.spa).to.be.an.instanceOf(app.views.SPAView);
      });

      it("should set isInSidebar to false if no isInSidebar option is given",
        function() {
          appView = new app.views.AppView(appViewOptions);

          expect(appView.isInSidebar).to.equal(false);
        });

      it("should set isInSidebar to the value of the isInSidebar option",
        function() {
          appViewOptions.isInSidebar = true;
          appView = new app.views.AppView(appViewOptions);

          expect(appView.isInSidebar).to.equal(true);
        });
    });
  });

  describe("events", function() {

    var appViewOptions;

    beforeEach(function() {
      var $el = $("<div id='appViewDiv'>" +
        "  <nav>" +
        "    <ul>" +
        "      <li>" +
        "        <a class='user-entry'></a>" +
        "      </li>" +
        "    </ul>" +
        "  </nav>" +
        "</div>");
      $("#fixtures").append($el);
      appViewOptions = {
        el: $el.get()[0],
        user: {},
        users: [],
        appStatus: [],
        spa: {}
      };
      sandbox.stub(window, "close");
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    describe("click", function() {
      it("should call window.close when fired on a.user-entry" +
        " if the appView is not running in a sidebar", function() {

        appViewOptions.isInSidebar = false;
        var appView = new app.views.AppView(appViewOptions);

        var $link = appView.$("a.user-entry");
        $link.trigger("click");

        sinon.assert.calledOnce(window.close);
        sinon.assert.calledWithExactly(window.close);
      });

      it("should not call window.close when fired on a.user-entry" +
        " if the appView is running in a sidebar", function() {

        appViewOptions.isInSidebar = true;
        var appView = new app.views.AppView(appViewOptions);

        var $link = appView.$("a.user-entry");
        $link.trigger("click");

        sinon.assert.notCalled(window.close);
      });
    });

    describe("resize", function() {
      it("should update the panel css when it's resized", function() {
        appViewOptions.isInSidebar = false;
        var appView = new app.views.AppView(appViewOptions);
        sandbox.stub(appView.$el, "css");

        appView.trigger("resize", 400, 300);

        sinon.assert.calledOnce(appView.$el.css);
        sinon.assert.calledWithExactly(appView.$el.css, "max-height", "180px");
      });

      it("shouldn't update css when we're in a sidebar", function() {
        appViewOptions.isInSidebar = true;
        var appView = new app.views.AppView(appViewOptions);
        sandbox.stub(appView.$el, "css");

        appView.trigger("resize", 400, 300);

        sinon.assert.notCalled(appView.$el.css);
      });
    });
  });

});
