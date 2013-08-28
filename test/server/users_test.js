/* global describe, it, beforeEach */
/* jshint expr:true */

var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");

var Users = require("../../server/users").Users;
var User = require("../../server/users").User;
var logger = require("../../server/logger");

describe("User", function() {

  var user, sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    user = new User("foo");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#toJSON", function() {

    it("should return a JSON serialisable structure", function() {
      expect(user.toJSON()).to.deep.equal({nick: "foo"});
    });

  });

  describe("#connect", function() {

    it("should attach the given websocket to the user", function() {
      user.connect("fake ws");
      expect(user.ws).to.equal("fake ws");
    });

  });

  describe("#disconnect", function() {

    it("should close the WebSocket of a user and remove it", function() {
      var fakeWS = {close: sinon.spy()};
      user.connect(fakeWS).disconnect();

      sinon.assert.calledOnce(fakeWS.close);
      expect(user.ws).to.equal(undefined);
    });

  });

  describe("#send", function() {

    it("should send data throught the attached websocket", function() {
      var fakeWS = {send: sinon.spy()};
      var data = {message: "some message"};
      var errback = function() {};
      user.connect(fakeWS);

      user.send(data, errback);

      sinon.assert.calledOnce(fakeWS.send);
      sinon.assert.calledWithExactly(
        fakeWS.send, JSON.stringify(data), errback);
    });

    it("should log an error if the websocket does not exist", function() {
      var data = {message: "some message"};
      var errback = function() {};
      sandbox.stub(logger, "error");

      user.send(data, errback);

      sinon.assert.calledOnce(logger.error);
      sinon.assert.calledWithExactly(
        logger.error, {type: "websocket", err: new Error()});
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

  describe("#present", function() {

    it("should return the list of present users only", function() {
      var ws = "fake ws";

      expect(users.present().length).to.equal(0);

      // 2 connected users
      users.add("foo").add("bar");
      users.forEach(function(user) {
        user.connect(ws);
      });
      // 1 not connected
      users.add("goo");

      expect(users.present().length).to.equal(2);
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

      // No WebSocket object
      expect(users.toJSON()).to.deep.equal([
        {nick: "foo"},
        {nick: "bar"},
        {nick: "goo"}
      ]);
    });

    it("should take the given users as reference", function() {
      users.add("foo").add("bar").add("goo");
      users.get("foo").connect("fake ws");
      expect(users.toJSON(users.present())).to.deep.equal([{nick: "foo"}]);
    });

  });

});
