/* global describe, it, beforeEach, afterEach, sinon */
//var expect = chai.expect;

describe("Services", function() {
  "use strict";

  var sandbox;

  describe("#_postToWorker", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should test something");
  });

});
