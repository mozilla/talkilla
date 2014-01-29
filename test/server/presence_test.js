/* jshint expr:true */
"use strict";

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

chai.Assertion.includeStack = true;

require("../../server/server");
var presence = require("../../server/presence");
var User = require("../../server/users").User;
var logger = require("../../server/logger");
var config = require('../../server/config').config;

describe("presence", function() {

  var sandbox;
  var api = presence.api;
  var users = presence._users;
  var anons = presence._anons;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    users.forEach(function(user) {
      users.remove(user.nick);
    });
    sandbox.restore();
  });

  describe("authenticated users hooks", function() {
    describe("#onadduser", function() {

      it("should send to all users that a new user connected", function() {
        var bar = users.add("bar").get("bar");
        var xoo = users.add("xoo").get("xoo");
        sandbox.stub(bar, "send");
        sandbox.stub(xoo, "send");

        users.add("foo");

        sinon.assert.calledOnce(bar.send);
        sinon.assert.calledWithExactly(bar.send, "userJoined", "foo");
        sinon.assert.calledOnce(xoo.send);
        sinon.assert.calledWithExactly(xoo.send, "userJoined", "foo");
      });

      it("should not send the notification to the user herself", function() {
        var foo;
        var originalOnAddUser = users.onadduser;
        sandbox.stub(users, "onadduser", function(user) {
          foo = user;
          sandbox.spy(user, "send");
          originalOnAddUser(user);
        });

        users.add("foo");

        sinon.assert.notCalled(foo.send);
      });

    });

    describe("#onremoveuser", function() {

      it("should send to all users that a user disconnected", function() {
        var bar = users.add("bar").get("bar");
        var xoo = users.add("xoo").get("xoo");
        users.add("foo").get("foo");
        sandbox.stub(bar, "send");
        sandbox.stub(xoo, "send");

        users.remove("foo");

        sinon.assert.calledOnce(bar.send);
        sinon.assert.calledWithExactly(bar.send, "userLeft", "foo");
        sinon.assert.calledOnce(xoo.send);
        sinon.assert.calledWithExactly(xoo.send, "userLeft", "foo");
      });

      it("should not send the notification to the user himself", function() {
        var foo = users.add("foo").get("foo");
        var originalOnRemoveUser = users.onremoveuser;
        sandbox.stub(users, "onremoveuser", function(user) {
          foo = user;
          sandbox.spy(user, "send");
          originalOnRemoveUser(user);
        });

        users.remove("foo");

        sinon.assert.notCalled(foo.send);
      });

    });

  });

  describe("api", function() {

    // XXX: this method is private but critical. That's why we have
    // test coverage for it. In the future we might pull it out into a
    // separate object as a way to separate concerns.
    describe("#_setupUser", function() {
      var fakeId, firstRequest, clock;

      beforeEach(function() {
        fakeId = '123123';
        firstRequest = true;
        // Use fake timers here to keep the tests running fast and
        // avoid waiting for the second long timeouts to occur.
        clock = sandbox.useFakeTimers();
      });

      it("should add the user with the given id if it isn't in users",
        function() {

          var user = api._setupUser(users, fakeId, firstRequest);

          expect(user).to.be.an.instanceOf(User);
        });

      it("should remove the user from users if it is disconnected",
        function() {

          var user = api._setupUser(users, fakeId, firstRequest);
          user.ondisconnect();

          expect(users.get(fakeId)).to.equal(undefined);
        });

      it("should clean leftover state if firstRequest is encountered while " +
        "user is considered online", function() {
        var user = users.add(fakeId).get(fakeId);
        sandbox.stub(user, "clearPending");

        api._setupUser(users, fakeId, firstRequest);

        expect(users.get(fakeId)).to.equal(user);
        sinon.assert.calledOnce(user.clearPending);
      });

    });

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

      it("should send the user's long poll connection a disconnect event",
        function() {
          sandbox.stub(User.prototype, "send");
          var req = {session: {email: "foo", reset: function() {}}};
          var res = {send: function() {}};
          users.add("foo");

          api.signout(req, res);

          sinon.assert.calledOnce(User.prototype.send);
          sinon.assert.calledWithExactly(User.prototype.send,
            "disconnect", null);
        });

      it("should disconnect the user", function() {
        sandbox.stub(User.prototype, "disconnect");
        var req = {session: {email: "foo", reset: function() {}}};
        var res = {send: sinon.spy()};

        users.add("foo");
        api.signout(req, res);
        sinon.assert.calledOnce(User.prototype.disconnect);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWith(res.send, 200, JSON.stringify(true));
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
        sinon.assert.calledWithExactly(res.send, 400);
      });

    });

    describe("#stream", function() {
      var fakeId, clock;

      beforeEach(function() {
        fakeId = '123123';
        // Use fake timers here to keep the tests running fast and
        // avoid waiting for the second long timeouts to occur.
        clock = sinon.useFakeTimers();
      });

      afterEach(function() {
        clock.restore();
      });

      it("should return an empty event list if it's user's first request",
        function() {
          var req = {body: {firstRequest: true}, session: {email: fakeId}};
          var res = {send: sinon.spy()};

          api.stream(req, res);

          sinon.assert.calledOnce(res.send);
          sinon.assert.calledWithExactly(res.send, 200, "[]");
        });

      it("should extend the long polling timeout", function() {
        var req = {body: {}, session: {email: fakeId}};
        var res = {send: function() {}};
        var user = users.add(fakeId).get(fakeId);
        sandbox.stub(user, "touch");

        api.stream(req, res);

        sinon.assert.calledOnce(user.touch);
      });

      it("should wait for events until user.send is called", function() {
        var req = {body: {firstRequest: false}, session: {email: fakeId}};
        var res = {send: sinon.spy()};
        var user = users.add(fakeId).get(fakeId);

        api.stream(req, res);

        // ensure 0 < wait time < timeout
        clock.tick(config.LONG_POLLING_TIMEOUT/2);
        sinon.assert.notCalled(res.send);
        user.send("some", "data");
        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(
          res.send, 200, JSON.stringify([{topic: "some", data: "data"}]));
      });

      it("should return immediately with a list of queued events if " +
        "the queue is not empty", function() {
        var req = {body: {firstRequest: false}, session: {email: fakeId}};
        var res = {send: sinon.spy()};
        var user = users.add(fakeId).get(fakeId);
        user.connect();
        user.send("foo", "oof");
        user.send("bar", "rab");

        api.stream(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 200, JSON.stringify([
          {topic: "foo", data: "oof"},
          {topic: "bar", data: "rab"}
        ]));
      });


      it("should send an empty list of events if the timeout is reached",
        function() {
          var req = {body: {firstRequest: false}, session: {email: fakeId}};
          var res = {send: sinon.spy()};
          users.add(fakeId).get(fakeId);

          api.stream(req, res);

          clock.tick(config.LONG_POLLING_TIMEOUT);
          sinon.assert.calledOnce(res.send);
          sinon.assert.calledWithExactly(res.send, 200, "[]");
        });

      it("should use the anonymous collection when the user " +
        "does not have an email", function() {
        var req = {body: {firstRequest: false}, session: {}};
        var res = {send: sinon.spy()};
        var user = anons.add(fakeId).get(fakeId);
        sandbox.stub(api, "_genId").returns(fakeId);
        sandbox.stub(api, "_setupUser").returns(user);

        api.stream(req, res);

        // XXX when we test the id generator separately, we should move
        // away from testing the impl with stubs and instead look at the
        // side effect on anons for this specific test
        sinon.assert.calledOnce(api._setupUser);
        sinon.assert.calledWithExactly(api._setupUser, anons, fakeId);
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
          sinon.assert.calledWithExactly(bar.send, "offer", forwardedEvent);
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
          sinon.assert.calledWithExactly(bar.send, "answer", forwardedEvent);
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
          sinon.assert.calledWithExactly(bar.send, "hangup", forwardedEvent);
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
          sinon.assert.calledWithExactly(bar.send, "ice:candidate",
            forwardedEvent);
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

    describe("#instantSharePingBack", function() {

      var req, res, foo, bar;

      beforeEach(function() {
        req = {session: {email: "foo"}, params: {email: "bar"}};
        res = {send: sinon.spy()};
        foo = users.add("foo").get("foo");
        bar = users.add("bar").get("bar");

        sandbox.stub(foo, "send");
      });

      it("should send the given peer to myself", function() {
        api.instantSharePingBack(req, res);

        sinon.assert.calledOnce(foo.send);
        sinon.assert.calledWithExactly(foo.send, "instantshare", {
          peer: "bar"
        });
      });

      it("should return a 200 OK response", function() {
        api.instantSharePingBack(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 200);
      });

      // XXX will be removed by https://trello.com/c/al5ER6ei
      it("should return a 400 if the user is not logged in", function() {
        req.session.email = undefined;
        api.instantSharePingBack(req, res);

        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 400);
      });

    });

    describe("#instantShare", function() {

      var req, res;

      beforeEach(function() {
        req = {session: {email: "foo"}, params: {email: "bar"}};
        res = {sendfile: sinon.spy()};
      });

      it("should send the 'static/instant-share.html' page", function() {
        api.instantShare(req, res);

        sinon.assert.calledOnce(res.sendfile);
        sinon.assert.calledWithMatch(res.sendfile,
          'instant-share.html');
      });

    });

  });
});
