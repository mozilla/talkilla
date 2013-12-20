/* jshint expr:true */
"use strict";

var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");

chai.Assertion.includeStack = true;

var config = require('../../server/config').config;
var logger = require('../../server/logger');
var Users = require("../../server/users").Users;
var User = require("../../server/users").User;
var Waiter = require("../../server/users").Waiter;

describe("User", function() {

  var user, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    user = new User("foo");
    user.ondisconnect = sinon.spy();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#toJSON", function() {

    it("should return a JSON serialisable structure", function() {
      expect(user.toJSON()).to.deep.equal({nick: "foo"});
    });

  });

  describe("#send", function() {

    it("should queue the data if no pending timeout is available", function() {
      var event = {topic: "message", data: "some message"};
      // Pretend there's a timeout, to make the user present.
      user.timeout = true;

      user.send(event.topic, event.data);

      expect(user.events).to.deep.equal([event]);
    });

    it("should stop to wait for events if one is available",
      function(done) {
        var event = {topic: "message", data: "some message"};
        user.waitForEvents(function(events) {
          expect(events).to.deep.equal([event]);
          done();
        });

        user.send(event.topic, event.data);
      });

    it("should queue the data if the pending timeout has already been resolved",
      function() {
        var event = {topic: "message", data: "some message"};
        // Pretend there's a timeout, to make the user present.
        user.timeout = true;
        user.pending = new Waiter();
        user.pending.resolved = true;

        user.send(event.topic, event.data);

        expect(user.events).to.deep.equal([event]);
      });

    it("should log a warning if the user is not present", function() {
      sandbox.stub(logger, "warn");

      user.send("message", "some message");

      expect(user.events).to.deep.equal([]);
      sinon.assert.calledOnce(logger.warn);
    });
  });

  describe("#clearPending", function() {
    it("should not throw if there are no pending events", function() {
      expect(user.clearPending.bind(user)).not.to.Throw();
    });

    it("should clear the pending event", function() {
      user.pending = { clear: sinon.spy() };
      var pendingSpy = user.pending.clear;

      user.clearPending();

      sinon.assert.calledOnce(pendingSpy);
      expect(user.pending).to.be.undefined;
    });
  });

  describe("#waitForEvents", function() {
    var clock;

    beforeEach(function() {
      // Use fake timers here to keep the tests running fast and
      // avoid waiting for the second long timeouts to occur.
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    it("should execute the given callback if there is events",
      function() {
        user.events = [1, 2, 3];
        user.waitForEvents(function(events) {
          expect(events).to.deep.equal([1, 2, 3]);
        });
        expect(user.events).to.deep.equal([]);
      });

    it("should timeout if no events are sent in the meantime", function(done) {
      var beforeTimeout = new Date().getTime();
      user.waitForEvents(function(events) {
        var afterTimeout = new Date().getTime();

        expect(events).to.deep.equal([]);
        expect((afterTimeout - beforeTimeout) >= config.LONG_POLLING_TIMEOUT)
          .to.equal(true);
        done();
      });
      clock.tick(config.LONG_POLLING_TIMEOUT * 3);
    });

    it("should stop the timeout and execute the callback " +
       "if events are sent in the meantime",
      function(done) {
        var beforeTimeout = new Date().getTime();

        user.waitForEvents(function(events) {
          var afterTimeout = new Date().getTime();

          expect(events).to.deep.equal([{topic: "some", data: "data"}]);
          expect((afterTimeout - beforeTimeout) < config.LONG_POLLING_TIMEOUT)
            .to.equal(true);
          done();
        });

        setTimeout(function() {
          user.send("some", "data");
        }, 10);
        clock.tick(config.LONG_POLLING_TIMEOUT * 3);
      });

  });

  describe("#connect", function() {

    it("should start the disconnect timeout", function() {
      user.connect();
      expect(user.timeout).to.not.equal(undefined);
    });

  });

  describe("#touch", function() {

    it("should reset the current timeout", function() {
      var oldTimeout, newTimeout;

      user.connect();
      oldTimeout = user.timeout;
      user.touch();
      newTimeout = user.timeout;

      expect(oldTimeout).to.not.equal(newTimeout);
    });

    it("should return the user itself", function() {
      expect(user.touch()).to.equal(user);
    });

  });

  describe("#disconnect", function() {
    beforeEach(function() {
      user.connect();
    });

    it("should trigger the ondisconnect callback", function() {
      user.disconnect();
      sinon.assert.calledOnce(user.ondisconnect);
    });

    it("should turn the timeout into an undefined object", function() {
      user.disconnect();
      expect(user.timeout).to.equal(undefined);
    });

  });

});

describe("Users", function() {

  var users;

  beforeEach(function() {
    users = new Users();
  });

  describe("#hasNick", function() {

    it("should return false if the nick does not exist", function() {
      expect(users.hasNick("foo")).to.be.equal(false);
    });

    it("should return true if the nick already exists", function() {
      users.add("foo");
      expect(users.hasNick("foo")).to.be.equal(true);
    });

  });

  describe("#add", function() {

    it("should add a new user to the collection", function() {
      users.add("bar");
      expect(users.get("bar").toJSON()).to.deep.equal({nick: "bar"});
    });

  });

  describe("#all", function() {

    it("should return all the users as an array", function() {
      var all = users.add("foo").add("bar").add("goo").all();
      var foo = users.get("foo");
      var bar = users.get("bar");
      var goo = users.get("goo");

      expect(all[0]).to.equal(foo);
      expect(all[1]).to.equal(bar);
      expect(all[2]).to.equal(goo);
    });

  });

  describe("#get", function() {

    it("should return the user having the given nick", function() {
      users.add("bar");
      expect(users.get("bar").toJSON()).to.deep.equal({nick: "bar"});
    });

    it("should retun undefined if the user does not exists", function() {
      expect(users.get("bar")).to.equal(undefined);
    });

  });

  describe("#remove", function() {

    it("should remove the user having the given nick", function() {
      users.add("bar").remove("bar");
      expect(users.get("bar")).to.be.equal(undefined);
    });
  });

  describe("#forEach", function() {

    it("should iterate on users", function() {
      var expected = [];
      users.add("foo").add("bar").add("goo");
      users.forEach(function(user) {
        expected.push(user);
      });

      expect(expected).to.deep.equal(users.all());
    });

  });

  describe("#toJSON", function() {

    it("should return a JSON serialisable structure", function() {
      users.add("foo").add("bar").add("goo");
      expect(users.toJSON()).to.deep.equal([
        {nick: "foo"},
        {nick: "bar"},
        {nick: "goo"}
      ]);
    });

    it("should cleanup the unserialisable properties", function() {
      users.add("foo").add("bar").add("goo");
      users.get("foo").connect("fake ws");

      expect(users.toJSON()).to.deep.equal([
        {nick: "foo"},
        {nick: "bar"},
        {nick: "goo"}
      ]);
    });

    it("should take the given users as reference", function() {
      users.add("foo").add("bar").add("goo");
      expect(users.toJSON([users.get("foo")])).to.deep.equal([{nick: "foo"}]);
    });

  });

});
