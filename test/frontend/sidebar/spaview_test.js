/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("SPAView", function() {
  var sandbox, view, user, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spa = new app.models.SPA({capabilities: ["call"]});
    user = new app.models.User({username: "boriss", presence: "connected"});
    view = new app.views.SPAView({user: user, spa: spa});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should require a user parameter", function() {
      expect(function() {
        new app.views.SPAView({});
      }).to.Throw(/user/);
    });

    it("should require a spa parameter", function() {
      expect(function() {
        new app.views.SPAView({user: {}});
      }).to.Throw(/spa/);
    });
  });

  describe("#dial", function() {
    it("should dial a number", function() {
      sandbox.stub(spa, "dial");

      view.dial({
        preventDefault: sinon.spy(),
        currentTarget: {number: {value: "123"}}
      });

      sinon.assert.calledOnce(spa.dial);
      sinon.assert.calledWithExactly(spa.dial, "123");
    });
  });

  describe("#display", function() {
    beforeEach(function() {
      view.$el = {
        addClass: sinon.spy(),
        removeClass: sinon.spy()
      };
    });

    it("should show el when arg is true", function() {
      view.display(true);

      sinon.assert.calledOnce(view.$el.removeClass);
      sinon.assert.calledWithExactly(view.$el.removeClass, "hide");
    });

    it("should hide el when arg is false", function() {
      view.display(false);

      sinon.assert.calledOnce(view.$el.addClass);
      sinon.assert.calledWithExactly(view.$el.addClass, "hide");
    });
  });

  describe("#render", function() {
    beforeEach(function() {
      sandbox.stub(view, "display");
    });

    it("should hide the dialer when the user is not signed in", function() {
      user.set("presence", "disconnected");

      sinon.assert.calledOnce(view.display);
      sinon.assert.calledWithExactly(view.display, false);
    });

    it("should hide the dialer when the SPA doesn't support it", function() {
      spa.set("capabilities", ["move"]);

      sinon.assert.calledOnce(view.display);
      sinon.assert.calledWithExactly(view.display, false);
    });

    it("should show the dialer when the SPA support it", function() {
      spa.set("capabilities", ["move", "pstn-call"]);

      sinon.assert.calledOnce(view.display);
      sinon.assert.calledWithExactly(view.display, true);
    });
  });
});
