/* global Server */
/* global describe, beforeEach, afterEach, sinon, it */

// importScripts('worker/microevent.js');

describe("Server", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#signin", function() {
    it("should send a signin request to the server", function() {
      var server = new Server(), callback = function() {};
      sandbox.stub(server, "post");

      server.signin("fake assertion", callback);

      sinon.assert.calledOnce(server.post);
      sinon.assert.calledWithExactly(server.post, "/signin",
                                     {assertion: "fake assertion"},
                                     callback);
    });
  });

  describe("#signout", function() {

    it("should send a signout request to the server", function() {
      var server = new Server(), callback = function() {};
      sandbox.stub(server, "post");

      server.signout("foo", callback);

      sinon.assert.calledOnce(server.post);
      sinon.assert.calledWithExactly(server.post, "/signout",
                                     {nick: "foo"},
                                     callback);
    });

  });
});

