/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("SPAView", function() {
  var sandbox, view, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spa = new app.models.SPA({capabilities: ["call"]});
    view = new app.views.SPAView({spa: spa});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should require an spa parameter", function() {
      expect(function() {
        new app.views.SPAView({});
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

  describe("#render", function() {
    it("should hide the dialer when the SPA doesn't support it", function() {
      sandbox.stub(view.$el, "addClass");

      spa.set("capabilities", ["move"]);

      sinon.assert.calledOnce(view.$el.addClass);
    });

    it("should show the dialer when the SPA support it", function() {
      sandbox.stub(view.$el, "removeClass");

      spa.set("capabilities", ["move", "pstn-call"]);

      sinon.assert.calledOnce(view.$el.removeClass);
    });
  });
});
