/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */
var expect = require("chai").expect;
var request = require("request");
var server = require("../server").server;
var findNewNick = require("../server").findNewNick;

var connection;

describe("Server", function() {
  describe("presence", function() {

    beforeEach(function() {
      connection = server.listen(3000);
    });

    afterEach(function() {
      connection.close();
    });

    it("should have no users logged in", function() {
      expect(server.get("users")).to.be.empty;
    });

    it("should have foo logged in", function(done) {
      request.post("http://localhost:3000/signin", {form: {nick: "foo"}}, function() {
        expect(server.get("users")).to.eql([{nick: "foo"}]);
        done();
      });
    });

    it("should have no users logged in", function(done) {
      request.post("http://localhost:3000/signin", {form: {nick: "foo"}}, function() {
        request.post("http://localhost:3000/signout", {form: {nick: "foo"}}, function() {
          expect(server.get("users")).to.be.empty;
          done();
        });
      });
    });

    it("should return the user's nick", function(done) {
      var nick1 = "foo";
      request.post("http://localhost:3000/signin", {form: {nick: nick1}}, function(err, res, body) {
        var data = JSON.parse(body);
        expect(data.nick).to.eql(nick1);
        expect(data.users).to.eql([{nick: "foo"}]);
        done();
      });
    });

    it("should fix the user's nick if it already exists", function(done) {
      var nick1 = "foo";
      request.post("http://localhost:3000/signin", {form: {nick: nick1}}, function(err, res, body) {
        request.post("http://localhost:3000/signin", {form: {nick: nick1}}, function(err, res, body) {
          expect(JSON.parse(body).nick).to.eql(findNewNick(nick1));
          done();
      });
      });
    });

    it("should preserve existing characters of the nick when finding a new one", function() {
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

    it("should return existing users", function(done) {
      var nick1 = "foo";
      var nick2 = "bar";
      request.post("http://localhost:3000/signin", {form: {nick: nick1}}, function() {
        request.post("http://localhost:3000/signin", {form: {nick: nick2}}, function(err, res, body) {
          var data = JSON.parse(body);
          console.log(body);
          expect(data.nick).to.eql(nick2);
          expect(data.users).to.eql([{nick: nick1}, {nick: nick2}]);
          done();
        });
      });
    });
  });
});
