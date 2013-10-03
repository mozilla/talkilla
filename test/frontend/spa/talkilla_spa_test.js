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
      var event = {nick: "foo"};
      sandbox.stub(spa.server, "connect");

      spa.port.trigger("connect", event);

      sinon.assert.calledOnce(spa.server.connect);
      sinon.assert.calledWithExactly(spa.server.connect, "foo");
    });

  });

  describe("#_onAutoconnect", function() {

    it("should autoconnect to the server", function() {
      var event = {nick: "foo"};
      sandbox.stub(spa.server, "autoconnect");

      spa.port.trigger("autoconnect", event);

      sinon.assert.calledOnce(spa.server.autoconnect);
      sinon.assert.calledWithExactly(spa.server.autoconnect, "foo");
    });

  });

  describe("#_onSignin", function() {

    it("should signin to the server and post back the result", function(done) {
      sandbox.stub(spa.server, "signin", function(assertion, callback) {
        expect(assertion).to.equal("fake assertion");
        callback("foo", "bar");

        sinon.assert.calledOnce(spa.port.post);
        sinon.assert.calledWithExactly(
          spa.port.post, "signin-callback", {err: "foo", response: "bar"});
        done();
      });
      sandbox.stub(spa.port, "post");

      spa.port.trigger("signin", {assertion: "fake assertion"});
    });

  });

  describe("#_onSignout", function() {

    it("should signout to the server and post back the result",
      function(done) {
        sandbox.stub(spa.server, "signout", function(nick, callback) {
          expect(nick).to.equal("foo");
          callback("foo", "bar");

          sinon.assert.calledOnce(spa.port.post);
          sinon.assert.calledWithExactly(
            spa.port.post, "signout-callback", {err: "foo", response: "bar"});
          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("signout", {nick: "foo"});
      });

  });

  describe("#_onCallOffer", function() {

    it("should send an offer to the server and post back the result",
      function(done) {
        sandbox.stub(spa.server, "callOffer", function(data, nick, callback) {
          expect(data).to.equal("fake offer data");
          expect(nick).to.equal("foo");
          callback("err", "response");

          sinon.assert.calledOnce(spa.port.post);
          sinon.assert.calledWithExactly(
            spa.port.post,
            "call:offer-callback", {
              err: "err",
              response: "response"
            });

          done();
        });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("call:offer", {data: "fake offer data", nick: "foo"});
      });

  });

  describe("#_onCallAccepted", function() {

    it("should send an answer to the server and post back the result",
      function(done) {
        sandbox.stub(spa.server, "callAccepted",
          function(data, nick, callback) {
            expect(data).to.equal("fake answer data");
            expect(nick).to.equal("foo");
            callback("err", "response");

            sinon.assert.calledOnce(spa.port.post);
            sinon.assert.calledWithExactly(
              spa.port.post,
              "call:accepted-callback", {
                err: "err",
                response: "response"
              });

            done();
          });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("call:accepted", {
          data: "fake answer data",
          nick: "foo"
        });
      });

  });

  describe("#_onCallHangup", function() {

    it("should send a hangup to the server and post back the result",
      function(done) {
        sandbox.stub(spa.server, "callHangup",
          function(data, nick, callback) {
            expect(data).to.equal("fake hangup data");
            expect(nick).to.equal("foo");
            callback("err", "response");

            sinon.assert.calledOnce(spa.port.post);
            sinon.assert.calledWithExactly(
              spa.port.post,
              "call:hangup-callback", {
                err: "err",
                response: "response"
              });

            done();
          });
        sandbox.stub(spa.port, "post");

        spa.port.trigger("call:hangup", {
          data: "fake hangup data",
          nick: "foo"
        });
      });

  });
});