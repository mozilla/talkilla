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
/*
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
*/
      // XXX This currently incorporates both pending and success. Once we stub
      // and create actual unit tests, we should separate these out again.
      it("should respond with a success message if I pass in valid data",
        function(done) {
          var hadPending = false;
          port.onmessage = function(event) {
            var topic = event.data.topic;
            var data = event.data.data;
            if (topic === "talkilla.login-pending") {
              expect(hadPending).to.equal(false);
              expect(data).to.equal(null);
              hadPending = true;
            }
            else {
              expect(hadPending).to.equal(true);
              expect(topic).to.equal("talkilla.login-success");
              expect(data.username).to.equal("jb1");
              done();
            }
          };

          port.postMessage({topic: "talkilla.login", data: {username: "jb1"} });
        });
    });

  });
}

