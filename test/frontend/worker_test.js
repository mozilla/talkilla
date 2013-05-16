/* global chai, describe, it */
/* jshint expr:true */
var expect = chai.expect;

if ('mozSocial' in navigator) {
  describe('Worker', function() {
    it("should be available", function() {
      expect(navigator.mozSocial.getWorker()).to.exist;
    });

    var port = navigator.mozSocial.getWorker().port;

    describe("#login", function() {
      it("should respond with a failure message if i pass in bogus data",
        function(done) {
          port.onmessage = function(event) {
            var topic = event.data.topic;
            var data = event.data.data;
            expect(topic).to.equal("talkilla.login-failure");
            expect(data).to.be.not.empty;
            done();
          };

          port.postMessage({topic: "talkilla.login", data: null});
        });

      it("should respond with a pending message if I pass in valid data",
        function(done) {
          port.onmessage = function(event) {
            var topic = event.data.topic;
            var data = event.data.data;
            expect(topic).to.equal("talkilla.login-pending");
            expect(data).to.equal(null);
            done();
          };

          port.postMessage({topic: "talkilla.login", data: {username: "jb"} });
        });
    });


  });
}

