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

      it("should send to all the present users an new one joined", function() {
        users.add("foo");
        var bar = users.add("bar").get("bar");
        var xoo = users.add("xoo").get("xoo");
        var oof = users.add("oof").get("oof");
        var req = {body: {nick: "foo"}};
        var res = {send: function() {}};
        sandbox.stub(bar, "present").returns(true);
        sandbox.stub(xoo, "present").returns(true);
        sandbox.stub(bar, "send").returns(true);
        sandbox.stub(xoo, "send").returns(true);
        sandbox.stub(oof, "send").returns(true);

        api.stream(req, res);

        sinon.assert.calledOnce(bar.send);
        sinon.assert.calledWith(bar.send, {userJoined: "foo"});
        sinon.assert.calledOnce(xoo.send);
        sinon.assert.calledWith(xoo.send, {userJoined: "foo"});
        sinon.assert.notCalled(oof.send);
      });

      it("should send an empty list of events", function(done) {
        var user = users.add("foo").get("foo");
        var req = {body: {nick: "foo"}};
        var res = {send: function(code, data) {
          expect(code).to.equal(200);
          expect(data).to.equal(JSON.stringify([]));
          done();
        }};
        sandbox.stub(user, "present").returns(true);

        api.stream(req, res);
        clock.tick(config.LONG_POLLING_TIMEOUT * 3);
      });

      it("should send a list of events", function(done) {
        var user = users.add("foo").get("foo");
        var event = {some: "data"};
        var req = {body: {nick: "foo"}};
        var res = {send: function(code, data) {
          expect(code).to.equal(200);
          expect(data).to.equal(JSON.stringify([event]));
          done();
        }};
        sandbox.stub(user, "present").returns(true);

        api.stream(req, res);
        user.send(event);
      });

      it("should fail if no nick is provided", function() {
        var req = {body: {}};
        var res = {send: sinon.spy()};

        api.stream(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 400, JSON.stringify({}));
      });

    });

    describe("#callOffer", function() {

      it("should forward the event to the peer after swapping the nick",
        function() {
          var req = {body: {data: {peer: "bar"}, nick: "foo"}};
          var res = {send: function() {}};
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callOffer(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(
            bar.send, {"incoming_call": forwardedEvent});
        });

      it("should warn on handling offers to unknown users", function() {
        sandbox.stub(logger, "warn");
        var req = {body: {data: {peer: "bar"}}};
        var res = {send: function() {}};

        api.callOffer(req, res);

        sinon.assert.calledOnce(logger.warn);
      });

    });

    describe("#callAccepted", function() {

      it("should forward the event to the peer after swapping the nick",
        function() {
          var req = {body: {data: {peer: "bar"}, nick: "foo"}};
          var res = {send: function() {}};
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callAccepted(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(
            bar.send, {"call_accepted": forwardedEvent});
        });

      it("should warn on handling answers to unknown users", function() {
        sandbox.stub(logger, "warn");
        var req = {body: {data: {peer: "bar"}}};
        var res = {send: function() {}};

        api.callAccepted(req, res);

        sinon.assert.calledOnce(logger.warn);
      });
    });

    describe("#callHangup", function() {

      it("should forward the event to the peer after swapping the nick",
        function() {
          var req = {body: {data: {peer: "bar"}, nick: "foo"}};
          var res = {send: function() {}};
          var forwardedEvent = {peer: "foo"};
          var bar = users.add("foo").add("bar").get("bar");
          sandbox.stub(bar, "send");

          api.callHangup(req, res);

          sinon.assert.calledOnce(bar.send);
          sinon.assert.calledWith(
            bar.send, {"call_hangup": forwardedEvent});
        });

      it("should warn on handling hangups to unknown users", function() {
        sandbox.stub(logger, "warn");
        var req = {body: {data: {peer: "bar"}}};
        var res = {send: function() {}};

        api.callHangup(req, res);

        sinon.assert.calledOnce(logger.warn);
      });
    });

    describe("#presenceRequest", function() {

      it("should send the list of present users to the given user",
        function() {
          var req = {body: {nick: "foo"}};
          var res = {send: sinon.spy()};
          var foo = users.add("foo").get("foo");
          var bar = users.add("bar").get("bar");
          sandbox.stub(users, "present").returns([bar]);
          sandbox.stub(foo, "send");

          api.presenceRequest(req, res);

          sinon.assert.calledOnce(foo.send);
          sinon.assert.calledWithExactly(foo.send, {users: [bar.toJSON()]});
        });

    });
  });
});
