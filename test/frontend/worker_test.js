/* global chai, describe, it */
/* jshint expr:true */
var expect = chai.expect;

if ('mozSocial' in navigator) {
  describe('Worker', function() {
    it("should be available", function() {
      expect(navigator.mozSocial.getWorker()).to.exist;
    });
  });
}
