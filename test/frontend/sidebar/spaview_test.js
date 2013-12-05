/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("SPAView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
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

  describe("#render", function() {
    var view, spa;

    beforeEach(function() {
      spa = new app.models.SPA({capabilities: ["call"]});
      view = new app.views.SPAView({spa: spa});
    });

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
