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
      var event = "fake event";
      sandbox.stub(spa.port, "post");

      spa.server.trigger("connected", event);

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(spa.port.post, "connected", "fake event");
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

      spa.port.trigger("connect", {some: "credentials"});

      sinon.assert.calledOnce(spa.server.connect);
      sinon.assert.calledWithExactly(spa.server.connect,
                                     {some: "credentials"});
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

        spa.port.trigger("offer", {offer: "fake offer data", to: "foo"});
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
          to: "foo"
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

        spa.port.trigger("hangup", {to: "foo"});
      });

  });
});