/* global describe, it, beforeEach */
/* jshint expr:true */

var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon");

var Users = require("../../server/users");

describe("Users", function() {

  var users;

  beforeEach(function() {
    users = new Users();
  });

  describe("#hasNick", function() {

    it("should return false if the nick is available", function() {
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
      expect(users.get("bar")).to.deep.equal({nick: "bar"});
    });

  });

  describe("#all", function() {

    it("should return all the users as an array", function() {
      users.add("foo").add("bar").add("goo");
      expect(users.all()).to.deep.equal([
        {nick: "foo"},
        {nick: "bar"},
        {nick: "goo"}
      ]);
    });

  });

  describe("#get", function() {

    it("should return the user having the given nick", function() {
      users.add("bar");
      expect(users.get("bar")).to.deep.equal({nick: "bar"});
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

  describe("#connect", function() {

    it("should attach a given websocket to a user", function() {
      users.add("foo").connect("foo", "fake ws");
      expect(users.get("foo").ws).to.equal("fake ws");
    });

  });

  describe("#disconnect", function() {

    it("should close the WebSocket of a user and remove it", function() {
      var fakeWS = {close: sinon.spy()};
      users.add("foo").connect("foo", fakeWS).disconnect("foo");

      sinon.assert.calledOnce(fakeWS.close);
      expect(users.get("foo").ws).to.equal(undefined);
    });

  });

  describe("#present", function() {

    it("should return the list of present users only", function() {
      var ws = "fake ws";

      expect(users.present().length).to.equal(0);

      // 2 connected users
      users.add("foo").add("bar");
      users.forEach(function(user) {
        users.connect(user.nick, ws);
      });
      // 1 not connected
      users.add("goo");

      expect(users.present().length).to.equal(2);
    });

  });

  describe("#toJSON", function() {

    it("should return a JSON serialisable structure", function() {
      users.add("foo").add("bar").add("goo");
      expect(users.toJSON()).to.deep.equal(users.all());
    });

    it("should cleanup the unserialisable properties", function() {
      users.add("foo").add("bar").add("goo")
        .connect("foo", "fake ws");

      expect(users.toJSON()).to.deep.equal([
        {nick: "foo"},
        {nick: "bar"},
        {nick: "goo"}
      ]);
    });

    it("should take the given users as reference", function() {
      users.add("foo").add("bar").add("goo").connect("foo", "fake ws");
      expect(users.toJSON(users.present())).to.deep.equal([{nick: "foo"}]);
    });

  });

});
