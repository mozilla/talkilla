/*global app, sinon */
"use strict";

describe("DialInView", function() {
  var sandbox, view, user, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spa = new app.models.SPA({capabilities: ["call"]});
    user = new app.models.CurrentUser({
      username: "boriss",
      presence: "connected"
    });
    view = new app.views.DialInView({user: user, spa: spa});
  });

  afterEach(function() {
    sandbox.restore();
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

    it("should hide the dialer when the SPA doesn't support it", function() {
      spa.set("capabilities", ["move"]);
      view.render();

      sinon.assert.calledOnce(view.display);
      sinon.assert.calledWithExactly(view.display, false);
    });

    it("should show the dialer when the SPA support it", function() {
      spa.set("capabilities", ["move", "pstn-call"]);
      view.render();

      sinon.assert.calledOnce(view.display);
      sinon.assert.calledWithExactly(view.display, true);
    });
  });
});
