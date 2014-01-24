/*global app, sinon, chai */
"use strict";

var expect = chai.expect;

describe("GearMenuView", function() {
  var sandbox, gearMenuView, user;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    $('#fixtures').append([
      '<div id="gear-menu">',
      '  <form id="signout"><strong class="user username"></strong></form>',
      '</div>'
    ].join(''));
    user = new app.models.CurrentUser();
    gearMenuView = new app.views.GearMenuView({
      user: user
    });
  });

  afterEach(function() {
    sandbox.restore();
    $('#fixtures').empty();
  });

  describe("#signout", function() {
    var clickEvent = {preventDefault: function() {}};

    it("should call sign out on the user model", function() {
      sandbox.stub(gearMenuView.user, "signout");

      gearMenuView.signout(clickEvent);

      sinon.assert.calledOnce(gearMenuView.user.signout);
    });
  });

  describe("#render", function() {
    it("should display the name of the connected user", function() {
      user.set("username", "alexis");
      gearMenuView.render();
      expect(gearMenuView.$('#signout .username').text()).to.eql('alexis');
    });
  });

  describe("User events", function() {
    beforeEach(function() {
      sandbox.stub(app.views.GearMenuView.prototype, "render");
      gearMenuView = new app.views.GearMenuView({
        user: user
      });
    });

    it("should trigger #render", function() {
      gearMenuView.user.set("username", "alexis");

      sinon.assert.calledOnce(gearMenuView.render);
    });
  });
});
