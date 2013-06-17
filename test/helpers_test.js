/* global describe, it, before, after */
/* jshint expr:true */

var expect = require("chai").expect;
var helpers = require('./functional/helpers');

describe("Functional Helpers", function() {

  describe("#after", function() {

    it("should only run the callback after 3 calls", function() {
      var n = 0
      var fun = helpers.after(3, function() {
        n += 1;
      });

      fun();
      fun();
      fun();

      expect(n).to.equal(1);
    });

  });
});
