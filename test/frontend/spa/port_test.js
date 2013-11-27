/* global sinon, SPAPort, expect */
"use strict";

describe("SPAPort", function() {
  var port;

  before(function() {
    window.postMessage = sinon.spy();
    port = new SPAPort();
  });

  after(function() {
    window.postMessage = window.onmessage = undefined;
  });

  describe("#post", function() {

    it("should post a message", function() {
      port.post("foo", "bar");
      sinon.assert.calledOnce(window.postMessage);
      sinon.assert.calledWithExactly(window.postMessage, {
        topic: "foo",
        data: "bar"
      });
    });

  });

  describe("#on", function() {

    it("should trigger the callback when receiving an event", function(done) {
      var event = {data: {topic: "foo", data: "bar"}};
      port.on("foo", function(data) {
        expect(data).to.equal("bar");
        done();
      });
      window.onmessage(event);
    });

  });
});

