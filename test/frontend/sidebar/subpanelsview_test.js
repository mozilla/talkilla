/*global app, chai, sinon, GoogleContacts */
"use strict";

var expect = chai.expect;

describe("SubPanelsView", function() {
  var sandbox, user, spa, appStatus, subPanelsView, subPanelsViewOptions;

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

    subPanelsViewOptions = {
      user: user,
      users: new app.models.UserSet(),
      appStatus: appStatus,
      spa: spa,
      service: new GoogleContacts()
    };
  });

  afterEach(function() {
    sandbox.restore();
    $('#fixtures').empty();
  });

  describe("Events", function() {
    beforeEach(function() {
      sandbox.stub(app.views.SubPanelsView.prototype, "render");
      subPanelsView = new app.views.SubPanelsView(subPanelsViewOptions);
    });

    describe("User events", function() {
      it("signout should trigger #render", function() {
        user.trigger("signout");
        sinon.assert.calledOnce(subPanelsView.render);
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
      subPanelsView = new app.views.SubPanelsView(subPanelsViewOptions);
    });

    it("should call #render on the subviews", function() {
      sandbox.stub(app.views.UsersView.prototype, 'render');
      sandbox.stub(app.views.DialInView.prototype, 'render');
      sandbox.stub(app.views.GearMenuView.prototype, 'render');
      sandbox.stub(app.views.ImportContactsView.prototype, 'render');

      subPanelsView = new app.views.SubPanelsView(subPanelsViewOptions);
      subPanelsView.render();

      sinon.assert.calledOnce(subPanelsView.usersView.render);
      sinon.assert.calledOnce(subPanelsView.dialInView.render);
      sinon.assert.calledOnce(subPanelsView.gearMenuView.render);
      sinon.assert.calledOnce(subPanelsView.importContactsView.render);
    });

    it("should display the pstn-dialin tab if the SPA supports it", function() {
      spa.set("capabilities", ["pstn-call"]);

      expect(subPanelsView.$("#dialin-tab").is(':visible')).to.equal(true);
    });

    it("should hide the pstn-dialin tab if the SPA doesn't support it",
      function() {
      spa.set("capabilities", ["call"]);

      expect(subPanelsView.$("#dialin-tab").is(':visible')).to.equal(false);
    });

    it("should hide subpanels if the user is no longer connected", function() {
      user.set("username", undefined).trigger("signout");

      expect(subPanelsView.$el.is(':visible')).to.equal(false);
    });

    it("should show subpanels when the user is signed in", function() {
      user.set("username", "bob");

      expect(subPanelsView.$el.is(':visible')).to.equal(true);
    });
  });
});
