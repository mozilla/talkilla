/* global Server */
/* global describe, beforeEach, afterEach, sinon, it, expect */

describe("Server", function() {
  var sandbox, server;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "WebSocket").returns({send: sinon.spy()});
    server = new Server();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#connect", function() {

    beforeEach(function() {
      sandbox.stub(server, "_longPolling");
    });

    it("should request a stream", function() {
      sandbox.stub(server.http, "post");
      server.connect({nick: "foo"});

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/stream", {nick: "foo"});
    });

    it("should trigger a connected event", function(done) {
      sandbox.stub(server.http, "post", function(method, nick, callback) {
        callback(null, "[]");
      });
      server.on("connected", function() {
        done();
      });

      server.connect({nick: "foo"});
    });

    it("should trigger a disconnected event if the request has been aborted",
      function(done) {
        sandbox.stub(server.http, "post", function(method, nick, callback) {
          callback(0, "request aborted");
        });
        server.on("disconnected", function() {
          done();
        });

        server.connect({nick: "foo"});
      });

    it("should trigger a unauthorized event if the request returns a 400",
      function(done) {
        sandbox.stub(server.http, "post", function(method, nick, callback) {
          callback(400, "bad request");
        });
        server.on("unauthorized", function() {
          done();
        });

        server.connect({nick: "foo"});
      });

    it("should call #_longPolling", function(done) {
      sandbox.stub(server.http, "post", function(method, nick, callback) {
        callback(null, "[]");
        sinon.assert.calledOnce(server._longPolling);
        sinon.assert.calledWithExactly(server._longPolling, "foo", []);
        done();
      });

      server.connect({nick: "foo"});
    });

  });

  describe("#_longPolling", function() {

    it("should request a stream", function() {
      sandbox.stub(server.http, "post");
      server._longPolling("foo", []);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/stream", {nick: "foo"});
    });

    it("should trigger a disconnected event if the request has been aborted",
      function(done) {
        sandbox.stub(server.http, "post", function(method, data, callback) {
          callback(0, "request aborted");
        });
        server.on("disconnected", function() {
          done();
        });
        server._longPolling("foo", []);
      });

    it("should trigger a unauthorized event if the request returns a 400",
      function(done) {
        sandbox.stub(server.http, "post", function(method, data, callback) {
          callback(400, "bad request");
        });
        server.on("unauthorized", function() {
          done();
        });
        server._longPolling("foo", []);
      });

    it("should trigger a message event for each event", function(done) {
      var nbCall = 1;
      var events = [
        {first:  "event 1"},
        {second: "event 2"},
        {third:  "event 3"}
      ];
      sandbox.stub(server.http, "post");
      server.on("message", function(type, event) {
        if (nbCall === 1) {
          expect(type).to.equal("first");
          expect(event).to.equal("event 1");
        }

        if (nbCall === 2){
          expect(type).to.equal("second");
          expect(event).to.equal("event 2");
        }

        if (nbCall === 3) {
          expect(type).to.equal("third");
          expect(event).to.equal("event 3");
          done();
        }

        nbCall += 1;
      });

      server._longPolling("foo", events);
    });

    it("should trigger a custom message event", function(done) {
      var events = [{"sometype":  "event"}];

      sandbox.stub(server.http, "post");
      server.on("message:sometype", function(event) {
        expect(event).to.equal("event");
        done();
      });

      server._longPolling("foo", events);
    });

    it("should call #_longPolling again", function(done) {

      sandbox.stub(server.http, "post", function(method, data, callback) {
        sandbox.stub(server, "_longPolling");
        callback(null, "[]");
        sinon.assert.calledOnce(server._longPolling);
        sinon.assert.calledWithExactly(server._longPolling, "foo", []);
        done();
      });

      server._longPolling("foo", []);
    });

  });

  describe("#callOffer", function() {

    beforeEach(function() {
      server.nick = "foo";
    });

    it("should send an offer to a peer", function() {
      var offerData = "fake offer payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callOffer(offerData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/calloffer", {
          data: offerData,
          nick: "foo"
        }, callback);
    });

  });

  describe("#callAnswer", function() {

    beforeEach(function() {
      server.nick = "bar";
    });

    it("should accept a call from peer", function() {
      var answerData = "fake answer payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callAccepted(answerData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/callaccepted", {
          data: answerData,
          nick: "bar"
        }, callback);
    });

  });

  describe("#callHangup", function() {

    beforeEach(function() {
      server.nick = "xoo";
    });

    it("should hangup the call", function() {
      var hangupData = "fake hangup payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callHangup(hangupData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/callhangup", {
          data: hangupData,
          nick: "xoo"
        }, callback);
    });

  });

  describe("#presenceRequest", function() {

    it("should send a presence request", function() {
      sandbox.stub(server.http, "post");

      server.presenceRequest("foo");

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/presencerequest", {
        nick: "foo"
      });
    });

  });

  describe.skip("websocket's events", function() {

    it("should trigger a 'connected' event when it opens", function() {
      var callback = sinon.spy();

      server.on("connected", callback);
      server.connect({nick: "foo"});
      server._ws.onopen();

      sinon.assert.calledOnce(callback);
    });

    it("should trigger a message event when it receives one", function() {
      var callback = sinon.spy();
      var event = {data: JSON.stringify({thisis: {an: "event"}})};

      server.on("message", callback);
      server.connect({nick: "foo"});
      server._ws.onmessage(event);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, "thisis", {an: "event"});
    });

    it("should trigger a custom event when it receives a message", function() {
      var callback = sinon.spy();
      var event = {data: JSON.stringify({custom: {an: "event"}})};

      server.on("message:custom", callback);
      server.connect({nick: "foo"});
      server._ws.onmessage(event);

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, {an: "event"});
    });

    it("should trigger an error event when having an error", function() {
      var callback = sinon.spy();

      server.on("error", callback);
      server.connect({nick: "foo"});
      server._ws.onerror("an error");

      sinon.assert.calledOnce(callback);
      sinon.assert.calledWithExactly(callback, "an error");
    });

    it("should trigger a disconnected event when it closes", function() {
      var callback = sinon.spy();

      server.on("disconnected", callback);
      server.connect({nick: "foo"});
      server._ws.onclose();

      sinon.assert.calledOnce(callback);
    });
  });

  describe.skip("#send", function() {
    it("should send serialized data throught the websocket", function() {
      server.connect({nick: "foo"});
      server.send({some: "data"});

      sinon.assert.calledOnce(server._ws.send);
      sinon.assert.calledWithExactly(server._ws.send,
                                     JSON.stringify({some: "data"}));
    });
  });
});

