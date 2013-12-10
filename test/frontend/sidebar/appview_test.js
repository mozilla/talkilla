/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("AppView", function() {
  var sandbox;

  describe("#initialize", function() {
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
      var appView;

      beforeEach(function() {
        appView = new app.views.AppView({
          user: {},
          users: [],
          appStatus: [],
          spa: {}
        });
      });

      it("should set a notifications property", function() {
        expect(appView.notifications).to.be.an.instanceOf(
          app.views.NotificationsView);
      });

      it("should set a login property", function() {
        expect(appView.login).to.be.an.instanceOf(app.views.LoginView);
      });

      it("should set a users property", function() {
        expect(appView.users).to.be.an.instanceOf(app.views.UsersView);
      });

      it("should set an spa property", function() {
        expect(appView.spa).to.be.an.instanceOf(app.views.SPAView);
      });
    });

    describe("events", function() {

      var appViewOptions;

      beforeEach(function() {
        var $el = $("<div id='appViewDiv'>" +
                    "  <nav>" +
                    "    <ul>" +
                    "      <li>" +
                    "        <a class='close-panel-on-click'></a>" +
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
        it("should call window.close when fired on a.close-panel-on-click" +
          " if the appView is not running in a sidebar", function() {

          appViewOptions.isInSidebar = false;
          var appView = new app.views.AppView(appViewOptions);

          var $link = appView.$("a.close-panel-on-click");
          $link.trigger("click");

          sinon.assert.calledOnce(window.close);
          sinon.assert.calledWithExactly(window.close);
        });

        it("should not call window.close when fired on a.close-panel-on-click" +
          " if the appView is running in a sidebar", function() {

          appViewOptions.isInSidebar = true;
          var appView = new app.views.AppView(appViewOptions);

          var $link = appView.$("a.close-panel-on-click");
          $link.trigger("click");

          sinon.assert.notCalled(window.close);
        });
      });

    });

  });
});
