/* global Server */
/* global describe, beforeEach, afterEach, sinon, it, expect */

// importScripts('worker/microevent.js');

describe("Server", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "WebSocket").returns({send: sinon.spy()});
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

  describe("#connect", function() {

    it("should create a websocket", function() {
      var server = new Server();
      server.connect("foo");

      expect(server._ws).to.not.equal(undefined);
    });

  });

  describe("#autoconnect", function() {

    it("should trigger a 'connected' event when it succeeded to reconnect",
      function() {
        var server = new Server();
        var callback = sinon.spy();

        server.on("connected", callback);
        server.autoconnect("foo");
        server._ws.onopen();

        sinon.assert.calledOnce(callback);
      });

    it("should trigger a 'disconnected' event when it failed to reconnect",
      function() {
        var server = new Server();
        var callback = sinon.spy();

        server.on("disconnected", callback);
        server.autoconnect("foo");
        server._ws.onerror();

        sinon.assert.calledOnce(callback);
      });

  });

  describe("websocket's events", function() {

    it("should trigger a 'connected' event when it opens", function() {
      var server = new Server();
      var callback = sinon.spy();

      server.on("connected", callback);
      server.connect("foo");
      server._ws.onopen();

      sinon.assert.calledOnce(callback);
    });

    it("should trigger a message event when it receive a message", function() {
      var server = new Server();
      var callback = sinon.spy();
      var event = {data: JSON.stringify({thisis: {an: "event"}})};

      server.on("message", callback);
      server.connect("foo");
      server._ws.onmessage(event);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, "thisis", {an: "event"});
    });

    it("should trigger a custom event when it receive a message", function() {
      var server = new Server();
      var callback = sinon.spy();
      var event = {data: JSON.stringify({custom: {an: "event"}})};

      server.on("message:custom", callback);
      server.connect("foo");
      server._ws.onmessage(event);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, {an: "event"});
    });

    it("should trigger an error event when having an error", function() {
      var server = new Server();
      var callback = sinon.spy();

      server.on("error", callback);
      server.connect("foo");
      server._ws.onerror("an error");

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, "an error");
    });

    it("should trigger a disconnected event when it closes", function() {
      var server = new Server();
      var callback = sinon.spy();

      server.on("disconnected", callback);
      server.connect("foo");
      server._ws.onclose();

      sinon.assert.calledOnce(callback);
    });
  });

  describe("#send", function() {
    it("should send serialized data throught the websocket", function() {
      var server = new Server();

      server.connect("foo");
      server.send({some: "data"});

      sinon.assert.calledOnce(server._ws.send);
      sinon.assert.calledWithExactly(server._ws.send,
                                     JSON.stringify({some: "data"}));
    });
  });
});

