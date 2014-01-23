/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("SubPanelsView", function() {
  var sandbox, user, spa, appStatus, subPanelsView;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    $('#fixtures').append($([
      '<div id="subpanels">',
      '  <ul class="nav nav-tabs">',
      '    <li id="dialin-tab">dialin</li>',
      '  </ul>',
      '</div>'
    ].join('')));
    user = new app.models.CurrentUser({"username": "alexis"});
    spa = new app.models.SPA();
    appStatus = new app.models.AppStatus({"workerInitialized": true});
  });

  afterEach(function() {
    sandbox.restore();
    $('#fixtures').empty();
  });

  describe("Events", function() {
    beforeEach(function() {
      sandbox.stub(app.views.SubPanelsView.prototype, "render");
      subPanelsView = new app.views.SubPanelsView({
        user: user,
        spa: spa,
        appStatus: appStatus
      });
    });

    describe("User events", function() {
      it("signout should trigger #render", function() {
        console.log("START user event signout");
        user.trigger("signout");
        sinon.assert.calledOnce(subPanelsView.render);
        console.log("END user event signout");
      });

      it("signin should trigger #render", function() {
        user.trigger("signin");
        sinon.assert.calledOnce(subPanelsView.render);
      });
    });

    describe("SPA events", function() {
      it("should trigger #render", function() {
        spa.set("capabilities", ["foo", "bar"]);
        sinon.assert.calledOnce(subPanelsView.render);
      });
    });
  });

  describe("#render", function() {
    beforeEach(function() {
      subPanelsView = new app.views.SubPanelsView({
        user: user,
        spa: spa,
        appStatus: appStatus
      });
    });

    it("should display the pstn-dialin tab if the SPA supports it", function() {
      spa.set("capabilities", ["pstn-call"]);
      subPanelsView.render();
      expect($("#dialin-tab").is(':visible')).to.equal(true);
    });

    it("should hide the pstn-dialin tab if the SPA doesn't support it",
      function() {
      spa.set("capabilities", ["call"]);
      subPanelsView.render();
      expect($("#dialin-tab").is(':visible')).to.equal(false);
    });

    it("should hide all the submenu if the user is not connected", function() {
      user.set("username", undefined);
      subPanelsView.render();
      expect($("#subpanels").is(':visible')).to.equal(false);
    });

    it("should show the submenu if the user is connected", function() {
      user.set("username", "alexis");
      subPanelsView.render();
      expect($("#subpanels").is(':visible')).to.equal(true);
    });
  });
});
