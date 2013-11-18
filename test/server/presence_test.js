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
var https = require("https");

require("../../server/server");
var presence = require("../../server/presence");
var User = require("../../server/users").User;
var logger = require("../../server/logger");
var config = require('../../server/config').config;

describe("presence", function() {

  var sandbox;
  var api = presence.api;
  var users = presence._users;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    users.forEach(function(user) {
      users.remove(user.nick);
    });
    sandbox.restore();
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

      it("should return the nick",
        function(done) {
          var req = {body: {assertion: "fake assertion"}, session: {}};
          var res = {send: sinon.spy()};
          var answer = JSON.stringify({nick: "foo"});
          sandbox.stub(presence.api, "_verifyAssertion", function(a, c) {
            c(null, "foo");

            sinon.assert.calledOnce(res.send);
            sinon.assert.calledWithExactly(res.send, 200, answer);
            done();
          });

          api.signin(req, res);
        });

      it("should return a 400 if the assertion was invalid", function(done) {
        var req = {body: {assertion: "fake assertion"}, session: {}};
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

      it("should disconnect the user", function() {
        sandbox.stub(User.prototype, "disconnect");
        var req = {session: {email: "foo", reset: function() {}}};
        var res = {send: sinon.spy()};

        users.add("foo");
        api.signout(req, res);
        sinon.assert.calledOnce(User.prototype.disconnect);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 200);
      });

      it("should reset the user's client session", function() {
        var req = {session: {email: "foo", reset: sinon.spy()}};
        var res = {send: function() {} };

        users.add("foo");
        api.signout(req, res);

        sinon.assert.calledOnce(req.session.reset);
      });

      it("should return a 400 if the assertion was invalid", function() {
        sandbox.stub(User.prototype, "disconnect");
        var req = {session: {email: null}};
        var res = {send: sinon.spy()};

        api.signout(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 400);
      });

    });

    describe("#stream", function() {
      var clock;

      beforeEach(function() {
        // Use fake timers here to keep the tests running fast and
        // avoid waiting for the second long timeouts to occur.
        clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        clock.restore();
      });

      it("should send to all users that a new user connected", function() {
          var bar = users.add("bar").get("bar");
          var xoo = users.add("xoo").get("xoo");
          var req = {session: {email: "foo"}};
          var res = {send: function() {}};
          sandbox.stub(bar, "send").returns(true);
          sandbox.stub(xoo, "send").returns(true);

          api.stream(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "userJoined", "foo");
          sinon.assert.calledOnce(xoo.send);
          sinon.assert.calledWith(xoo.send, "userJoined", "foo");
        });

      it("should send an empty list if connecting is specified in the body",
        function(done) {
          users.add("foo").get("foo");
          var req = {session: {email: "foo"}, body: {firstRequest: true}};
          var res = {send: function(code, data) {
            expect(code).to.equal(200);
            expect(data).to.equal(JSON.stringify([]));
            done();
          }};

          api.stream(req, res);
        });

      it("should send an empty list of events", function(done) {
        users.add("foo").get("foo");
        var req = {session: {email: "foo"}};
        var res = {send: function(code, data) {
          expect(code).to.equal(200);
          expect(data).to.equal(JSON.stringify([]));
          done();
        }};

        api.stream(req, res);
        clock.tick(config.LONG_POLLING_TIMEOUT * 3);
      });

      it("should send a list of events", function(done) {
        var user = users.add("foo").get("foo");
        var event = {topic: "some", data: "data"};
        var req = {session: {email: "foo"}};
        var res = {send: function(code, data) {
          expect(code).to.equal(200);
          expect(data).to.equal(JSON.stringify([event]));
          done();
        }};

        api.stream(req, res);
        user.send("some", "data");
      });

      it("should fail if no nick is provided", function() {
        var req = {session: {}};
        var res = {send: sinon.spy()};

        api.stream(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 400);
      });

      describe("disconnect", function() {

        beforeEach(function() {
          var req = {session: {email: "foo"}};
          var res = {send: function() {}};

          api.stream(req, res);
        });

        it("should remove the user from the list of users", function() {
          users.get("foo").disconnect();

          expect(users.get("foo")).to.be.equal(undefined);
        });

        it("should notify peers that the user left", function() {
          var bar = users.add("bar").get("bar");
          var xoo = users.add("xoo").get("xoo");
          sandbox.stub(bar, "send").returns(true);
          sandbox.stub(xoo, "send").returns(true);

          users.get("foo").disconnect();

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "userLeft", "foo");
          sinon.assert.calledOnce(xoo.send);
          sinon.assert.calledWith(xoo.send, "userLeft", "foo");
        });

      });

    });

    describe("#callOffer", function() {
      var req, res;

      beforeEach(function() {
        req = {body: {data: {peer: "bar"}}, session: {email: "foo"}};
        res = {send: sinon.spy()};
      });


      it("should forward the event to the peer after swapping the nick",
        function() {
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callOffer(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "offer", forwardedEvent);
        });

      it("should warn on handling offers to unknown users", function() {
        sandbox.stub(logger, "warn");

        api.callOffer(req, res);

        sinon.assert.calledOnce(logger.warn);
      });

      it("should return success", function() {
        users.add("foo").add("bar").get("bar");

        api.iceCandidate(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 204);
      });
    });

    describe("#callAccepted", function() {
      var req, res;

      beforeEach(function() {
        req = {body: {data: {peer: "bar"}}, session: {email: "foo"}};
        res = {send: sinon.spy()};
      });


      it("should forward the event to the peer after swapping the nick",
        function() {
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callAccepted(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "answer", forwardedEvent);
        });

      it("should warn on handling answers to unknown users", function() {
        sandbox.stub(logger, "warn");

        api.callAccepted(req, res);

        sinon.assert.calledOnce(logger.warn);
      });

      it("should return success", function() {
        users.add("foo").add("bar").get("bar");

        api.iceCandidate(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 204);
      });
    });

    describe("#callHangup", function() {
      var req, res;

      beforeEach(function() {
        req = {body: {data: {peer: "bar"}}, session: {email: "foo"}};
        res = {send: sinon.spy()};
      });

      it("should forward the event to the peer after swapping the nick",
        function() {
          var res = {send: function() {}};
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callHangup(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "hangup", forwardedEvent);
        });

      it("should warn on handling hangups to unknown users", function() {
        sandbox.stub(logger, "warn");

        api.callHangup(req, res);

        sinon.assert.calledOnce(logger.warn);
      });

      it("should return success", function() {
        users.add("foo").add("bar").get("bar");

        api.iceCandidate(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 204);
      });
    });

    describe("#iceCandidate", function() {
      var req, res;

      beforeEach(function() {
        req = {
          body:    {data: {peer: "bar", candidate: "dummy"}},
          session: {email: "foo"}
        };
        res = {send: sinon.spy()};
      });

      it("should forward the event to the peer after swapping the nick",
        function() {
          var forwardedEvent = {peer: "foo", candidate: "dummy"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.iceCandidate(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(bar.send, "ice:candidate", forwardedEvent);
        });

      it("should warn on handling candidates to unknown users", function() {
        sandbox.stub(logger, "warn");

        api.iceCandidate(req, res);

        sinon.assert.calledOnce(logger.warn);
      });

      it("should return success", function() {
        users.add("foo").add("bar").get("bar");

        api.iceCandidate(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 204);
      });
    });

    describe("#presenceRequest", function() {
      var req, res, foo, bar;

      beforeEach(function() {
        req = {session: {email: "foo"}};
        res = {send: sinon.spy()};
        foo = users.add("foo").get("foo");
        bar = users.add("bar").get("bar");

        sandbox.stub(foo, "send");
      });

      it("should send the list of connected users to the given user",
        function() {
          api.presenceRequest(req, res);

          sinon.assert.calledOnce(foo.send);
          sinon.assert.calledWithExactly(foo.send, "users", [
            foo.toJSON(),
            bar.toJSON()
          ]);
        });

      it("should return success", function() {
        api.presenceRequest(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 204);
      });
    });
  });
});
