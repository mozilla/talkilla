/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

var expect = require("chai").expect;
var request = require("request");
var app = require("../presence").app;
var path = require("path");
var findNewNick = require("../presence").findNewNick;
var merge = require("../presence").merge;
var getConfigFromFile = require("../presence").getConfigFromFile;

/* The "browser" variable predefines for jshint include WebSocket,
 * causes jshint to blow up here.  We should probably structure things
 * differently so that the browser predefines aren't turned on
 * for the node code at some point.  In the meantime, disable warning */
/* jshint -W079 */
var WebSocket = require('ws');

var connection;
var webSocket;

var serverPort = 3000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;
var socketURL = 'ws://' + serverHost + ':' + serverPort;

describe("Server", function() {

  describe("configuration", function() {

    it("should merge two configuration objects", function() {
      expect(merge({}, {})).to.deep.equal({});
      expect(merge({}, {b: 2})).to.deep.equal({b: 2});
      expect(merge({a: 1}, {})).to.deep.equal({a: 1});
      expect(merge({a: 1}, {b: 2})).to.deep.equal({a: 1, b: 2});
      expect(merge({a: 1}, {a: 2})).to.deep.equal({a: 2});
    });

    it("should parse a JSON configuration file", function() {
      var configRoot = path.join('..', 'config');
      var devConfig = getConfigFromFile(path.join(configRoot, 'dev.json'));
      expect(devConfig).to.have.property('DEBUG');
      expect(devConfig.DEBUG).to.be.ok;
      var prodConfig = getConfigFromFile(path.join(configRoot, 'prod.json'));
      expect(prodConfig).to.have.property('DEBUG');
      expect(prodConfig.DEBUG).to.be.not.ok;
    });

  });

  describe("presence", function() {

    function signin(nick, callback) {
      request.post(serverHttpBase + '/signin',
                   {form: {nick: nick}},
                   callback);
    }

    function signout(nick, callback) {
      request.post(serverHttpBase + '/signout',
                   {form: {nick: nick}},
                   callback);
    }

    beforeEach(function(done) {
      connection = app.start(serverPort, done);
    });

    afterEach(function() {
      app.shutdown(connection);
      if (webSocket) {
        webSocket.close();
        webSocket = null;
      }
    });

    it("should have no users logged in at startup", function() {
      expect(app.get("users")).to.be.empty;
    });

    it('should have no users logged in after logging in and out',
      function(done) {
      signin('foo', function() {
        signout('foo', function() {
          expect(app.get('users')).to.be.empty;
          done();
        });
      });
    });

    it("should return the user's nick", function(done) {
      var nick1 = 'foo';
      signin('foo', function(err, res, body) {
        var data = JSON.parse(body);
        expect(data.nick).to.eql(nick1);
        expect(data.users).to.be.empty;
        done();
      });
    });

    it("should fix the user's nick if it already exists", function(done) {
      var nick1 = 'foo';
      /* jshint unused: vars */
      signin(nick1, function(err, res, body) {
        signin(nick1, function(err, res, body) {
          expect(JSON.parse(body).nick).to.eql(findNewNick(nick1));
          done();
        });
      });
    });

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

    it("should return existing users", function(done) {
      var nick1 = "foo";
      var nick2 = "bar";

      signin(nick1, function() {
          signin(nick2, function(err, res, body) {
            var data = JSON.parse(body);
            expect(data.nick).to.eql(nick2);
            done();
          });
        });
    });

    it("should send a list with only the user to an open websocket when the " +
      "first user signs in",
      function (done) {
        webSocket = new WebSocket(socketURL);

        webSocket.on('error', function(error) {
          expect(error).to.equal(null);
        });

        webSocket.on('message', function (data, flags) {
          expect(flags.binary).to.equal(undefined);
          expect(flags.masked).to.equal(false);
          expect(JSON.parse(data).users).to.deep.equal([{nick: "foo"}]);
          done();
        });

        webSocket.on('open', function () {
          signin('foo');
        });
      });

    it("should send the list of signed in users when a new user signs in",
      function(done) {
        /* jshint unused: vars */
        var n = 1;
        webSocket = new WebSocket(socketURL);

        webSocket.on('error', function(error) {
          expect(error).to.equal(null);
        });

        webSocket.on('message', function(data, flags) {
          var parsed = JSON.parse(data);
          if (n === 1)
            expect(parsed.users).to.deep.equal([{nick:"first"}]);
          if (n === 2) {
            expect(parsed.users).to.deep.equal([{nick:"first"},
                                                {nick:"second"}]);
            done();
          }

          n++;
        });

        webSocket.on('open', function() {
          signin('first', function() {
            signin('second');
          });
        });
      });

    it("should send the list of signed in users when a user signs out",
      function(done) {
        /* jshint unused: vars */
        var n = 1;
        webSocket = new WebSocket(socketURL);

        webSocket.on('error', function(error) {
          expect(error).to.equal(null);
        });

        webSocket.on('message', function(data, flags) {
          var parsed = JSON.parse(data);
          if (n === 2)
            expect(parsed.users).to.deep.equal([{nick: "first"},
                                                {nick: "second"}]);
          if (n === 3) {
            expect(parsed.users).to.deep.equal([{nick: "second"}]);
            done();
          }

          n++;
        });

        webSocket.on('open', function() {
          signin('first', function() {
            signin('second', function() {
              signout('first');
            });
          });
        });

      });

  });
});
