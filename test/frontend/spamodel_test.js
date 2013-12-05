/*global chai, app, sinon */
"use strict";

var expect = chai.expect;

describe("app.models.SPA", function() {
  var sandbox, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spa = new app.models.SPA({capabilities: ["call", "pstn-call"]});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#dial", function() {
    it("should throw if SPA doesn't support PSTN calls", function() {
      spa.set("capabilities", []);

      expect(function() {
        spa.dial("123");
      }).to.Throw(/SPA doesn't support PSTN calls/);
    });

    it("should trigger a `dial` event with provided number", function() {
      sandbox.stub(spa, "trigger");

      spa.dial("123");

      sinon.assert.calledOnce(spa.trigger);
      sinon.assert.calledWithExactly(spa.trigger, "dial", "123");
    });
  });

  describe("#supports", function() {
    it("should throw if no capability is passed", function() {
      expect(spa.supports).to.Throw(/At least one capability/);
    });

    it("should check that SPA supports a capability", function() {
      expect(spa.supports("call")).eql(true);
      expect(spa.supports("xxx", "pstn-call")).eql(true);
    });

    it("should check that SPA doesn't support a capability", function() {
      expect(spa.supports("xxx")).eql(false);
      expect(spa.supports("xxx", "yyy")).eql(false);
    });
  });
});
