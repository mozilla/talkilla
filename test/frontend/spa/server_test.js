/* global Server */
/* global describe, beforeEach, afterEach, sinon, it, expect, payloads */
"use strict";

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
      server.connect();

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/stream", {
        firstRequest: true,
        timeout: 21000,
      });
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

    it("should trigger a network-error event if the request has been aborted",
      function(done) {
        sandbox.stub(server.http, "post", function(method, nick, callback) {
          callback(0, "request aborted");
        });
        server.on("network-error", function() {
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
        sinon.assert.calledWithExactly(server._longPolling, []);
        done();
      });

      server.connect({nick: "foo"});
    });

  });

  describe("#disconnect", function() {

    it("should abort the current long polling connection", function() {
      server.currentXHR = {abort: sinon.spy()};
      server.disconnect();

      sinon.assert.calledOnce(server.currentXHR.abort);
    });

  });

  describe("#signout", function() {

    it("should sign out the spa from the server", function() {
      sandbox.stub(server.http, "post");

      server.signout();

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(server.http.post, "/signout", {});
    });

  });

  describe("#_longPolling", function() {

    it("should request a stream", function() {
      sandbox.stub(server.http, "post");
      server._longPolling([]);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/stream");
    });

    it("should trigger a network-error event if the request has been aborted",
      function(done) {
        sandbox.stub(server.http, "post", function(method, data, callback) {
          callback(0, "request aborted");
        });
        server.on("network-error", function() {
          done();
        });
        server._longPolling([]);
      });

    it("should trigger a unauthorized event if the request returns a 400",
      function(done) {
        sandbox.stub(server.http, "post", function(method, data, callback) {
          callback(400, "bad request");
        });
        server.on("unauthorized", function() {
          done();
        });
        server._longPolling([]);
      });

    it("should trigger a message event for each event", function(done) {
      var nbCall = 1;
      var events = [
        {topic: "first",  data: "event 1"},
        {topic: "second", data: "event 2"},
        {topic: "third",  data: "event 3"}
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

      server._longPolling(events);
    });

    it("should trigger a custom message event", function(done) {
      var events = [{topic: "sometopic", data: "event"}];

      sandbox.stub(server.http, "post");
      server.on("message:sometopic", function(event) {
        expect(event).to.equal("event");
        done();
      });

      server._longPolling(events);
    });

    it("should call #_longPolling again", function(done) {

      sandbox.stub(server.http, "post", function(method, data, callback) {
        sandbox.stub(server, "_longPolling");
        callback(null, "[]");
        sinon.assert.calledOnce(server._longPolling);
        sinon.assert.calledWithExactly(server._longPolling, []);
        done();
      });

      server._longPolling([]);
    });

  });

  describe("#callOffer", function() {

    it("should send an offer to a peer", function() {
      var offerData = "fake offer payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callOffer(offerData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/calloffer", {data: offerData}, callback);
    });

  });

  describe("#callAnswer", function() {

    it("should accept a call from peer", function() {
      var answerData = "fake answer payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callAccepted(answerData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/callaccepted", {data: answerData}, callback);
    });

  });

  describe("#callHangup", function() {

    it("should hangup the call", function() {
      var hangupData = "fake hangup payload";
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.callHangup(hangupData, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWithExactly(
        server.http.post, "/callhangup", {data: hangupData}, callback);
    });

  });

  describe("#iceCandidate", function() {

    it("should send an ice candidate", function() {
      var iceCandidateMsg = new payloads.IceCandidate({
        peer: "lloyd",
        candidate: "dummy"
      });
      var callback = function() {};
      sandbox.stub(server.http, "post");
      server.nick = "lloyd";
      server.iceCandidate(iceCandidateMsg, callback);

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(
        server.http.post, "/icecandidate", {data: iceCandidateMsg}, callback);
    });

  });

  describe("#presenceRequest", function() {

    it("should send a presence request", function() {
      sandbox.stub(server.http, "post");

      server.presenceRequest("foo");

      sinon.assert.calledOnce(server.http.post);
      sinon.assert.calledWith(server.http.post, "/presencerequest");
    });

  });

});

