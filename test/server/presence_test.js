/* jshint expr:true */

/* The intent is for this to only add unit tests to this file going forward.
 *
 * XXX Before long, we're going to want to create a home for backend functional
 * tests, and move many of the tests that current live in this file there.
 */

var EventEmitter = require( "events" ).EventEmitter;

var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");
var http = require("http");
var https = require("https");

require("../../server/server");
var presence = require("../../server/presence");
var logger = require("../../server/logger");
var findNewNick = presence.findNewNick;

describe("presence", function() {

  var sandbox;
  var api = presence.api;
  var users = presence._users;
  var wss = presence._wss;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    users.forEach(function(user) {
      users.remove(user.nick);
    });
    sandbox.restore();
  });

  describe("#findNewNick", function() {

    it("should preserve existing chars of the nick when finding a new one",
      function() {
        var testNicks = {
          "foo": "foo1",
          "foo1": "foo2",
          "foo10": "foo11",
          "foo0": "foo1",
          "foo01": "foo02",
          "foo09": "foo10",

          // Now put a number in the "first part".
          "fo1o": "fo1o1",
          "fo1o1": "fo1o2",
          "fo1o10": "fo1o11",
          "fo1o0": "fo1o1",
          "fo1o01": "fo1o02",
          "fo1o09": "fo1o10"
        };
        for (var nick in testNicks)
          expect(findNewNick(nick)).to.equal(testNicks[nick]);
      });
  });

  describe("#configureWs", function() {

    it("should bind #api.ws.onMessage to message events", function() {
      var fakeWS = {on: sinon.spy()};

      sandbox.stub(api.ws.onMessage, "bind").returns(api.ws.onMessage);
      presence.configureWs(fakeWS);

      sinon.assert.called(fakeWS.on);
      sinon.assert.calledWithExactly(fakeWS.on, "message", api.ws.onMessage);
    });

    it("should bind #api.ws.onClose to close events", function() {
      var fakeWS = {on: sinon.spy()};

      sandbox.stub(api.ws.onClose, "bind").returns(api.ws.onClose);
      presence.configureWs(fakeWS);

      sinon.assert.called(fakeWS.on);
      sinon.assert.calledWithExactly(fakeWS.on, "close", api.ws.onClose);
    });

    it("should bind #api.ws.onCallOffer to call_offer events", function() {
      var fakeWS = {on: sinon.spy()};

      presence.configureWs(fakeWS);

      sinon.assert.called(fakeWS.on);
      sinon.assert.calledWithExactly(
        fakeWS.on, "call_offer", api.ws.onCallOffer);
    });

    it("should bind #api.ws.onCallAccepted to call_offer events", function() {
      var fakeWS = {on: sinon.spy()};

      presence.configureWs(fakeWS);

      sinon.assert.called(fakeWS.on);
      sinon.assert.calledWithExactly(
        fakeWS.on, "call_accepted", api.ws.onCallAccepted);
    });

    it("should bind #api.ws.onCallHangup to call_offer events", function() {
      var fakeWS = {on: sinon.spy()};

      presence.configureWs(fakeWS);

      sinon.assert.called(fakeWS.on);
      sinon.assert.calledWithExactly(
        fakeWS.on, "call_hangup", api.ws.onCallHangup);
    });

    it("should bind #api.ws.onPresenceRequest to presence_request events",
      function() {
        var fakeWS = {on: sinon.spy()};

        presence.configureWs(fakeWS);

        sinon.assert.called(fakeWS.on);
        sinon.assert.calledWithExactly(
          fakeWS.on, "presence_request", api.ws.onPresenceRequest);
      });

    it("should return the WebSocket", function() {
      var fakeWS = {on: sinon.spy()};
      var ws = presence.configureWs(fakeWS);
      expect(ws).to.equal(fakeWS);
    });

  });

  describe("api", function() {

    // XXX: this method is private but critical. That's why we have
    // test coverage for it. In the future we might pull it out into a
    // separate object as a way to separate concerns.
    describe("#_verifyAssertion", function() {

      var oldEnv;

      before(function() {
        oldEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = "development";
      });

      after(function() {
        process.env.NODE_ENV = oldEnv;
      });

      it("should send a secure http request to the verifier service",
        function() {
          var request = {write: function() {}, end: function() {}};
          var options = {
            host: "verifier.login.persona.org",
            path: "/verify",
            method: "POST"
          };
          sandbox.stub(https, "request").returns(request);
          api._verifyAssertion("fake assertion data", function() {});

          sinon.assert.calledOnce(https.request);
          sinon.assert.calledWith(https.request, sinon.match(options));
        });

      it("should trigger without error if the assertion is valid",
        function() {
          var assertionCallback = sinon.spy();
          var response = new EventEmitter();
          var request = {write: function() {}, end: function() {}};
          var answer = {
            status: "okay",
            email: "john.doe@mozilla.com"
          };
          response.setEncoding = function() {};

          sandbox.stub(https, "request", function(options, callback) {
            callback(response);
            return request;
          });
          api._verifyAssertion("fake assertion data", assertionCallback);

          response.emit("data", JSON.stringify(answer));
          response.emit("end");

          sinon.assert.calledOnce(assertionCallback);
          sinon.assert.calledWithExactly(
            assertionCallback, null, answer.email);
        });

      it("should trigger with an error if the assertion is invalid",
        function() {
          var assertionCallback = sinon.spy();
          var response = new EventEmitter();
          var request = {write: function() {}, end: function() {}};
          var answer = {
            status: "not okay",
            reason: "invalid assertion"
          };
          response.setEncoding = function() {};

          sandbox.stub(https, "request", function(options, callback) {
            callback(response);
            return request;
          });
          api._verifyAssertion("fake assertion data", assertionCallback);

          response.emit("data", JSON.stringify(answer));
          response.emit("end");

          sinon.assert.calledOnce(assertionCallback);
          sinon.assert.calledWithExactly(
            assertionCallback, answer.reason);
        });
    });

    describe("#signin", function() {

      it("should add a new user to the user list and return the nick",
        function(done) {
          var req = {body: {assertion: "fake assertion"}};
          var res = {send: sinon.spy()};
          var answer = JSON.stringify({nick: "foo"});
          sandbox.stub(presence.api, "_verifyAssertion", function(a, c) {
            c(null, "foo");

            expect(users.get("foo")).to.not.equal(undefined);

            sinon.assert.calledOnce(res.send);
            sinon.assert.calledWithExactly(res.send, 200, answer);
            done();
          });

          api.signin(req, res);
        });

      it("should return a 400 if the assertion was invalid", function(done) {
        var req = {body: {assertion: "fake assertion"}};
        var res = {send: sinon.spy()};
        var answer = JSON.stringify({error: "invalid assertion"});
        sandbox.stub(presence.api, "_verifyAssertion", function(a, c) {
          c("invalid assertion");

          expect(users.get("foo")).to.equal(undefined);

          sinon.assert.calledOnce(res.send);
          sinon.assert.calledWithExactly(res.send, 400, answer);
          done();
        });

        api.signin(req, res);
      });

    });

    describe("#signout", function() {

      it("should remove the user from the user list", function() {
        var req = {body: {nick: "foo"}};
        var res = {send: sinon.spy()};

        users.add("foo");
        api.signout(req, res);
        expect(users.get("foo")).to.equal(undefined);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 200);
      });

    });

    describe("WebSocket", function() {

      describe("#onMessage", function() {

        it("should emit the received JSON event", function() {
          var message = JSON.stringify({eventType: {data: "some data"}});
          var fakeWS = {emit: sinon.spy()};
          var onMessage = api.ws.onMessage.bind(fakeWS);

          onMessage("foo", message);

          sinon.assert.calledOnce(fakeWS.emit);
          sinon.assert.calledWithExactly(
            fakeWS.emit, "eventType", {data: "some data"}, "foo");
        });
      });

      describe("#onCallOffer", function() {

        it("should forward the event to the peer after swapping the nick",
          function() {
            var bar;
            var event = {peer: "bar"};
            var forwardedEvent = {peer: "foo"};
            users.add("foo").add("bar");
            bar = users.get("bar");
            sandbox.stub(bar, "send");

            api.ws.onCallOffer(event, "foo");

            sinon.assert.calledOnce(bar.send);
            sinon.assert.calledWith(
              bar.send, {"incoming_call": forwardedEvent});
          });

        it("should warn on handling offers to unknown users", function() {
          sandbox.stub(logger, "warn");

          var event = { peer: "bar" };

          api.ws.onCallOffer(event, "foo");

          sinon.assert.calledOnce(logger.warn);
        });

      });

      describe("#onCallAccepted", function() {

        it("should forward the event to the peer after swapping the nick",
          function() {
            var bar;
            var event = {peer: "bar"};
            var forwardedEvent = {peer: "foo"};
            users.add("foo").add("bar");
            bar = users.get("bar");
            sandbox.stub(bar, "send");

            api.ws.onCallAccepted(event, "foo");

            sinon.assert.calledOnce(bar.send);
            sinon.assert.calledWith(
              bar.send, {"call_accepted": forwardedEvent});
          });

        it("should warn on handling answers to unknown users", function() {
          sandbox.stub(logger, "warn");

          var event = { peer: "bar" };

          api.ws.onCallAccepted(event, "foo");

          sinon.assert.calledOnce(logger.warn);
        });
      });

      describe("#onCallHangup", function() {

        it("should forward the event to the peer after swapping the nick",
          function() {
            var bar;
            var event = {peer: "bar"};
            var forwardedEvent = {peer: "foo"};
            users.add("foo").add("bar");
            bar = users.get("bar");
            sandbox.stub(bar, "send");

            api.ws.onCallHangup(event, "foo");

            sinon.assert.calledOnce(bar.send);
            sinon.assert.calledWith(bar.send, {"call_hangup": forwardedEvent});
          });

        it("should warn on handling hangups to unknown users", function() {
          sandbox.stub(logger, "warn");

          var event = { peer: "bar" };

          api.ws.onCallHangup(event, "foo");

          sinon.assert.calledOnce(logger.warn);
        });
      });

      describe("#onPresenceRequest", function() {

        it("should send the list of present users",
          function() {
            var fakeWS = {send: sinon.spy()};
            var foo = users.add("foo").get("foo").connect(fakeWS);
            users.add("bar").get("bar").connect(fakeWS);
            var presentUsers = users.toJSON(users.present());
            var event = {presenceRequest: null};
            sandbox.stub(foo, "send");

            api.ws.onPresenceRequest(event, "foo");

            sinon.assert.calledOnce(foo.send);
            sinon.assert.calledWith(foo.send, {"users": presentUsers});
          });

      });

      describe("#onClose", function() {

        it("should disconnect the user", function() {
          var foo = users.add("foo").get("foo");
          sandbox.stub(foo, "disconnect");

          api.ws.onClose("foo");
          sinon.assert.calledOnce(foo.disconnect);
        });

        it("should notify all the _present_ users a user left", function() {
          var foo = users.add("foo").get("foo");
          var bar = users.add("bar").get("bar").connect("fake ws");
          var goo = users.add("goo").get("goo");

          sandbox.stub(foo, "disconnect");
          sandbox.stub(bar, "send");
          sandbox.stub(goo, "send");

          api.ws.onClose("foo");

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, {userLeft: "foo"});
          sinon.assert.notCalled(goo.send);
        });
      });

    });

    describe("#upgrade", function() {
      it("should manually upgrade the connection to WebSockets", function() {
        var fakeReq = {url: "/?nick=foo"};
        users.add("foo");
        sandbox.stub(http, "ServerResponse");
        sandbox.stub(wss, "handleUpgrade");
        sandbox.stub(api.onWebSocket, "bind").returns(api.onWebSocket);

        api.upgrade(fakeReq, "fake socket", "fake head upgrade");

        sinon.assert.calledOnce(wss.handleUpgrade);
        sinon.assert.calledWith(wss.handleUpgrade,
                                fakeReq, "fake socket", "fake head upgrade",
                                api.onWebSocket);
      });

      it("should fail if no nick is provided", function() {
        var fakeReq = {url: "/?nick=foo"};
        var fakeRes = {assignSocket: function() {}, end: function() {}};
        sandbox.stub(http, "ServerResponse").returns(fakeRes);
        sandbox.stub(wss, "handleUpgrade");

        api.upgrade(fakeReq, "fake socket", "fake head upgrade");

        expect(fakeRes.statusCode).to.equal(400);
      });
    });

    describe("#onWebSocket", function() {

      it("should attach a configured websocket to the user", function() {
        var fakeWS = {on: function() {}};
        var foo = users.add("foo").get("foo");
        sandbox.stub(presence, "configureWs");
        sandbox.stub(foo, "send");

        api.onWebSocket("foo", fakeWS);

        expect(users.get("foo").ws).to.deep.equal(fakeWS);
      });

      it("should notify the _present_ users a user joined", function() {
        var fakeWS = {on: function() {}};
        var foo = users.add("foo").get("foo");
        var bar = users.add("bar").get("bar").connect(fakeWS);
        sandbox.stub(presence, "configureWs");
        sandbox.stub(foo, "send");
        sandbox.stub(bar, "send");

        api.onWebSocket("foo", fakeWS);

        sinon.assert.calledOnce(bar.send);
        sinon.assert.calledWith(bar.send, {userJoined: "foo"});
      });

    });
  });
});
