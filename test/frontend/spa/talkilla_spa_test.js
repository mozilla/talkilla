/* global sinon, SPAPort, Server, TalkillaSPA, expect, payloads */

"use strict";

describe("TalkillaSPA", function() {
  var sandbox, port, server, spa;

  var fakeOffer = {fakeOffer: true};
  var fakeAnswer = {fakeAnswer: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    port = new SPAPort();
    server = new Server();

    sandbox.stub(server, "connect");
    spa = new TalkillaSPA(port, server, {capabilities: ["call", "move"]});
  });

  describe("#constructor", function() {
    it("should accept capabilities", function() {
      expect(spa.capabilities).to.be.a("array");
      expect(spa.capabilities).eql(["call", "move"]);
    });

    it("should call the server's connect method", function () {
      sinon.assert.calledOnce(server.connect);
      sinon.assert.calledWithExactly(server.connect);
    });
  });

  describe("#_onServerEvent", function() {

    describe("connected", function () {

      // XXX email shouldn't be a public member of the API, I don't think,
      // and as a result, and we should be avoiding using it to do the tests
      // I suspect we really want to be testing the connect and connected
      // events as a pair.

      it("should post a connected event containing the email address " +
        "to the worker port if spa.email is set", function() {

          spa.email = "foo";
          sandbox.stub(spa.port, "post");

          spa.server.trigger("connected");

          sinon.assert.calledOnce(spa.port.post);
          sinon.assert.calledWithExactly(
            spa.port.post, "connected", {
              addresses: [{type: "email", value: "foo"}],
              capabilities: ["call", "move"]
            }
          );
        });

      it("should post a connected event to the worker port if " +
        "not containing an email address is spa.email is not set", function() {

          delete spa.email;
          sandbox.stub(spa.port, "post");

          spa.server.trigger("connected");

          sinon.assert.calledOnce(spa.port.post);
          sinon.assert.calledWithExactly(
          spa.port.post, "connected", {
            capabilities: ["call", "move"]
          });
        });

      it("should post a presenceRequest to the server if spa.email is set",
        function() {
          spa.email = "foo";
          sandbox.stub(spa.port, "post");
          sandbox.stub(spa.server, "presenceRequest");

          spa.server.trigger("connected");

          sinon.assert.calledOnce(spa.server.presenceRequest);
          sinon.assert.calledWithExactly(spa.server.presenceRequest);
        });


      it("should not post a presenceRequest to the server if spa.email" +
        " is not set", function() {

          delete spa.email;

          sandbox.stub(spa.port, "post");
          sandbox.stub(spa.server, "presenceRequest");

          spa.server.trigger("connected");

          sinon.assert.notCalled(spa.server.presenceRequest);
        });

    });

    it("should post a reconnection event to the port", function() {
      var event = {timeout: 42, attempt: 2};
      sandbox.stub(spa.port, "post");

      spa.server.trigger("reconnection", event);

      sinon.assert.calledOnce(spa.port.post);
      sinon.assert.calledWithExactly(
        spa.port.post, "reconnection", new payloads.Reconnection(event));
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
        spa.port.post, "a type", "fake event");
    });

  });

  describe("#_onConnect", function() {

    it("should connect to the server", function() {
      spa.server.connect.reset(); // already stubbed, reset the state

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
          expect(data.offer).to.equal(fakeOffer);
          expect(data.peer).to.equal("foo");

          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("offer", {
          callid: 42,
          offer: fakeOffer,
          peer: "foo",
          upgrade: false
        });
      });

  });

  describe("#_onCallAccepted", function() {

    it("should send an answer to the server",
      function(done) {
        sandbox.stub(spa.server, "callAccepted", function(data, callback) {
          expect(data.answer).to.equal(fakeAnswer);
          expect(data.peer).to.equal("foo");

          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("answer", {
          answer: fakeAnswer,
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

        spa.port.trigger("hangup", {callid: 42, peer: "foo"});
      });

  });

  describe("#_onIceCandidate", function() {

    it("should send an iceCandidate to the server",
      function(done) {
        var candidate = {fakeCandidate: true};

        sandbox.stub(spa.server, "iceCandidate", function(data) {
          expect(data.peer).to.equal("foo");
          expect(data.candidate).to.equal(candidate);
          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("ice:candidate", {peer: "foo", candidate: candidate});
      });

  });

  describe("#_onForgetCredentials", function() {

    it("should disconnect the SPA from the server", function() {
      sandbox.stub(spa.server, "disconnect");

      spa.port.trigger("forget-credentials");

      sinon.assert.calledOnce(spa.server.disconnect);
    });

    it("should signout the SPA from the server", function() {
      sandbox.stub(spa.server, "signout");

      spa.port.trigger("forget-credentials");
      sinon.assert.calledOnce(spa.server.signout);
    });

  });

});
