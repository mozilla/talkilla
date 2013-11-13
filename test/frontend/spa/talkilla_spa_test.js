/* global sinon, SPAPort, Server, TalkillaSPA, expect */
/* jshint unused:false */

describe("TalkillaSPA", function() {
  var sandbox, port, server, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    port = new SPAPort();
    server = new Server();
    spa = new TalkillaSPA(port, server);
  });

  describe("#_onServerEvent", function() {

    it("should post a connect event to the port", function() {
      spa.email = "foo";
      sandbox.stub(spa.port, "post");

      spa.server.trigger("connected");

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(
        spa.port.post, "connected", {
          addresses: [{type: "email", value: "foo"}]
        }
      );
    });

    it("should post a disconnected event to the port", function() {
      var event = "fake event";
      sandbox.stub(spa.port, "post");

      spa.server.trigger("disconnected", event);

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(
        spa.port.post, "disconnected", "fake event");
    });

    it("should post a reauth-needed event to the port", function() {
      sandbox.stub(spa.port, "post");

      spa.server.trigger("unauthorized");

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(spa.port.post, "reauth-needed");
    });

  });

  describe("#_onServerMessage", function() {

    it("should post a message event to the port", function() {
      var event = "fake event";
      sandbox.stub(spa.port, "post");

      spa.server.trigger("message", "a type", event);

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(
        spa.port.post, "message", ["a type", "fake event"]);
    });

  });

  describe("#_onConnect", function() {

    it("should connect to the server", function() {
      sandbox.stub(spa.server, "connect");

      // The Talkilla SPA doesn't need any credentials. This is
      // handled via cookies.
      spa.port.trigger("connect", {some: "credentials"});

      sinon.assert.calledOnce(spa.server.connect);
      sinon.assert.calledWithExactly(spa.server.connect);
    });

  });

  describe("#_onCallOffer", function() {

    it("should send an offer to the server",
      function(done) {
        sandbox.stub(spa.server, "callOffer", function(data) {
          expect(data.offer).to.equal("fake offer data");
          expect(data.peer).to.equal("foo");

          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("offer", {offer: "fake offer data", peer: "foo"});
      });

  });

  describe("#_onCallAccepted", function() {

    it("should send an answer to the server",
      function(done) {
        sandbox.stub(spa.server, "callAccepted",
          function(data, nick, callback) {
            expect(data.answer).to.equal("fake answer data");
            expect(data.peer).to.equal("foo");

            done();
          });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("answer", {
          answer: "fake answer data",
          peer: "foo"
        });
      });

  });

  describe("#_onCallHangup", function() {

    it("should send a hangup to the server",
      function(done) {
        sandbox.stub(spa.server, "callHangup", function(data) {
          expect(data.peer).to.equal("foo");
          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("hangup", {peer: "foo"});
      });

  });

  describe("#_onIceCandidate", function() {

    it("should send an iceCandidate to the server",
      function(done) {
        var candidate = {
          candidate: "dummy"
        };

        sandbox.stub(spa.server, "iceCandidate", function(data) {
          expect(data.peer).to.equal("foo");
          expect(data.candidate).to.equal(candidate);
          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("ice:candidate", {peer: "foo", candidate: candidate});
      });

  });

});
