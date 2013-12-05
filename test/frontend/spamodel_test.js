/*global chai, app */
"use strict";

var expect = chai.expect;

describe("app.models.SPA", function() {
  var spa;

  beforeEach(function() {
    spa = new app.models.SPA({capabilities: ["a", "b"]});
  });

  describe("#supports", function() {
    it("should throw if no capability is passed", function() {
      expect(spa.supports).to.Throw(/At least one capability/);
    });

    it("should check that SPA supports a capability", function() {
      expect(spa.supports("a")).eql(true);
      expect(spa.supports("xxx", "b")).eql(true);
    });

    it("should check that SPA doesn't support a capability", function() {
      expect(spa.supports("xxx")).eql(false);
      expect(spa.supports("xxx", "yyy")).eql(false);
    });
  });
});
