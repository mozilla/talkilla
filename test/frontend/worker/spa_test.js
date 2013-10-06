/* global sinon, SPA, expect */
/* jshint unused:false */

describe("SPA", function() {
  var sandbox, worker, spa;

  beforeEach(function() {
    worker = {postMessage: sinon.spy()};
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker").returns(worker);
    spa = new SPA({src: "example.com"});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("constructor", function() {

    it("should instantiate a worker with the src option", function() {
      sinon.assert.calledOnce(window.Worker);
      sinon.assert.calledWithExactly(window.Worker, "example.com");
    });

    it("should throw an error if the src option is missing", function() {
      function shouldExplode() { new SPA(); }
      expect(shouldExplode).to.Throw(Error, /missing parameter: src/);
    });

  });

  describe("#on", function(done) {

    it("should trigger an event when receiving a message", function(done) {
      spa.on("foo", function(data) {
        expect(data).to.equal("bar");
        done();
      });

      worker.onmessage({data: {topic: "foo", data: "bar"}});
    });

  });

  describe("#signin", function() {

    it("should send a signin event to the worker", function() {
      var callback = function() {};
      spa.signin("fake assertion", callback);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "signin",
        data: {assertion: "fake assertion"}
      });
    });

    it("should wait for a signin-callback event", function(done) {
      var callback = function(err, response) {
        expect(err).to.equal("foo");
        expect(response).to.equal("bar");
        done();
      };
      var data = {err: "foo", response: "bar"};

      spa.signin("fake assertion", callback);
      spa.worker.onmessage({data: {topic: "signin-callback", data: data}});
    });

  });

  describe("#signout", function() {

    it("should send a signout event to the worker", function() {
      var callback = function() {};
      spa.signout("foo", callback);

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "signout",
        data: {nick: "foo"}
      });
    });

    it("should wait for a signout-callback event", function(done) {
      var callback = function(err, response) {
        expect(err).to.equal("foo");
        expect(response).to.equal("bar");
        done();
      };
      var data = {err: "foo", response: "bar"};

      spa.signout("foo", callback);
      spa.worker.onmessage({data: {topic: "signout-callback", data: data}});
    });

  });

  describe("#connect", function() {

    it("should send a connect event to the worker", function() {
      spa.connect("foo");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "connect",
        data: {nick: "foo"}
      });
    });

  });

  describe("#autoconnect", function() {

    it("should send an autoconnect event to the worker", function() {
      spa.autoconnect("foo");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "autoconnect",
        data: {nick: "foo"}
      });
    });

  });

  describe("#callOffer", function() {

    it("should send a call:offer event to the worker", function() {
      var callback = function() {};
      var data = {some: "data"};
      spa.callOffer(data, "foo");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "call:offer",
        data: {data: data, nick: "foo"}
      });
    });

    it("should wait for a call:offer-callback event", function(done) {
      var callback = function(err, response) {
        expect(err).to.equal("foo");
        expect(response).to.equal("bar");
        done();
      };
      var event = {data: {
        topic: "call:offer-callback",
        data: {err: "foo", response: "bar"}
      }};

      spa.callOffer("some data", "foo", callback);
      spa.worker.onmessage(event);
    });

  });

  describe("#callAccepted", function() {

    it("should send a call:accepted event to the worker", function() {
      var data = {some: "data"};
      spa.callAccepted(data, "foo");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "call:accepted",
        data: {data: data, nick: "foo"}
      });
    });

    it("should wait for a call:accepted-callback event", function(done) {
      var callback = function(err, response) {
        expect(err).to.equal("foo");
        expect(response).to.equal("bar");
        done();
      };
      var event = {data: {
        topic: "call:accepted-callback",
        data: {err: "foo", response: "bar"}
      }};

      spa.callAccepted("some data", "foo", callback);
      spa.worker.onmessage(event);
    });

  });

  describe("#callHangup", function() {

    it("should send a call:hangup event to the worker", function() {
      var data = {some: "data"};
      spa.callHangup(data, "foo");

      sinon.assert.calledOnce(spa.worker.postMessage);
      sinon.assert.calledWithExactly(spa.worker.postMessage, {
        topic: "call:hangup",
        data: {data: data, nick: "foo"}
      });
    });

    it("should wait for a call:hangup-callback event", function(done) {
      var callback = function(err, response) {
        expect(err).to.equal("foo");
        expect(response).to.equal("bar");
        done();
      };
      var event = {data: {
        topic: "call:hangup-callback",
        data: {err: "foo", response: "bar"}
      }};

      spa.callHangup("some data", "foo", callback);
      spa.worker.onmessage(event);
    });

  });
});