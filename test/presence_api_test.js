/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

/* The intent is for this to only add unit tests to this file going forward.
 *
 * XXX Before long, we're going to want to create a home for backend functional
 * tests, and move many of the tests that current live in this file there.
 */
var chai = require("chai");
var expect = chai.expect;
var sinon = require("sinon"); // XXX can sinon-chai re-export this?
var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var request = require("request");
var presence = require("../presence");
var app = presence.app;
var findNewNick = presence.findNewNick;
var _usersToArray = presence._usersToArray;

/* The "browser" variable predefines for jshint include WebSocket,
 * causes jshint to blow up here.  We should probably structure things
 * differently so that the browser predefines aren't turned on
 * for the node code at some point.  In the meantime, disable warning */
/* jshint -W079 */
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

var webSocket;

var serverPort = 3000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;
var socketURL = function(nick) {
  return 'ws://' + serverHost + ':' + serverPort + '/?nick=' + nick;
};


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

describe("Server", function() {

  describe("startup & shutdown", function() {

    describe("#_createWebSocketServer()", function() {
      it('should populate the exported _wss symbol with a new WebSocketServer',
        function() {
          var oldWss = presence._wss;

          presence._createWebSocketServer();

          expect(presence._wss).to.be.an.instanceOf(WebSocketServer);
          expect(presence._wss).to.not.equal(oldWss);

          presence._destroyWebSocketServer();
        });
    });

    describe("#_destroyWebSocketServer()", function() {
      var sandbox;

      beforeEach(function () {
        sandbox = sinon.sandbox.create();
        presence._createWebSocketServer();
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('should remove all listeners from the web socket server',
        function() {
          sandbox.stub(presence._wss);

          presence._destroyWebSocketServer();
          expect(presence._wss.removeAllListeners).to.have.been.called.once;
          expect(presence._wss.removeAllListeners).to.have.been.
            calledWithExactly();
        });

      it('should close the server', function() {
        sandbox.stub(presence._wss);

        presence._destroyWebSocketServer();
        expect(presence._wss.close).to.have.been.called.once;
      });
    });

    describe("#_configureWebSocketServer()", function() {
      var sandbox;
      var stubHttpServer = require('http').createServer();
      function fakeUpgradeHandler() {};

      beforeEach(function() {
        presence._createWebSocketServer();

        sandbox = sinon.sandbox.create();
        sandbox.stub(stubHttpServer);
      });

      afterEach(function() {
        sandbox.restore();
        presence._destroyWebSocketServer();
      });

      it('should not throw if a callback is not passed', function() {
        expect(presence._configureWebSocketServer(stubHttpServer,
          fakeUpgradeHandler)).to.not.Throw;
      });

      it('should call a passed callback once with no arguments',
        function(done) {
          var callback = sinon.spy(done);

          presence._configureWebSocketServer(stubHttpServer,
            fakeUpgradeHandler, callback);

          expect(callback).to.have.been.called.once;
          expect(callback).to.always.have.been.calledWithExactly();
        }
      );

      it('should add error and close handlers to the websocket server',
        function(done) {
          expect(presence._wss.listeners('error').length).to.equal(0);
          expect(presence._wss.listeners('close').length).to.equal(0);

          presence._configureWebSocketServer(stubHttpServer, fakeUpgradeHandler,
            function() {
              expect(presence._wss.listeners('error').length).to.equal(1);
              expect(presence._wss.listeners('close').length).to.equal(1);
              done();
            });
        });

      it('should add an upgrade handler to the http server',
        function(done) {

          presence._configureWebSocketServer(stubHttpServer, fakeUpgradeHandler,
            function() {
              expect(stubHttpServer.on).to.have.been.
                calledWithExactly('upgrade', fakeUpgradeHandler);
              done();
            });
        });
    });

    it("should answer requests on a given port after start() completes",
      function(done) {
        var retVal = app.start(serverPort, function() {
          signin('foo', function() {
            webSocket = new WebSocket(socketURL('foo'));

            webSocket.on('error', function(error) {
              expect(error).to.equal(null);
            });

            webSocket.on('open', function() {
              app.shutdown(done);
            });
          });
        });

        expect(retVal).to.equal(undefined);
      });

    it("should refuse requests after shutdown() completes");
  });

  describe("presence", function() {

    beforeEach(function(done) {
      app.start(serverPort, done);
    });

    afterEach(function(done) {
      if (webSocket) {
        webSocket.close();
        webSocket = null;
      }
      app.shutdown(done);
    });

    it("should transform a map of users into an array", function() {
      var users = {"foo": {ws: 1}, "bar": {ws: 2}};
      var expected = [{"nick": "foo"}, {"nick": "bar"}];
      expect(_usersToArray(users)).to.deep.equal(expected);
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

    it("should signin a user, open a corresponding websocket and receive a" +
       "a list with the only signed in user",
      function (done) {
        signin('foo', function() {
          webSocket = new WebSocket(socketURL('foo'));

          webSocket.on('error', function(error) {
            expect(error).to.equal(null);
          });

          webSocket.on('message', function (data, flags) {
            expect(flags.binary).to.equal(undefined);
            expect(flags.masked).to.equal(false);
            expect(JSON.parse(data).users).to.deep.equal([{nick: "foo"}]);
            done();
          });
        });
      });

    it("should send an updated list of signed in users when a new user" +
       "signs in",
      function(done) {
        /* jshint unused: vars */
        var nthMessage = 1;

        signin('first', function() {
          webSocket = new WebSocket(socketURL('first'));

          webSocket.on('error', function(error) {
            expect(error).to.equal(null);
          });

          webSocket.on('message', function(data, flags) {
            var parsed = JSON.parse(data);
            if (nthMessage === 1)
              expect(parsed.users).to.deep.equal([{nick:"first"}]);
            if (nthMessage === 2) {
              expect(parsed.users).to.deep.equal([{nick:"first"},
                                                  {nick:"second"}]);
              done();
            }

            nthMessage++;
          });

          webSocket.on('open', function() {
            signin('second', function() {
              new WebSocket(socketURL('second'));
            });
          });
        });

      });

    it("should send an updated list of signed in users when a user signs out",
      function(done) {
        /* jshint unused: vars */
        var nthMessage = 1;
        var ws;

        signin('first', function() {
          webSocket = new WebSocket(socketURL('first'));

          webSocket.on('error', function(error) {
            expect(error).to.equal(null);
          });

          webSocket.on('message', function(data, flags) {
            var parsed = JSON.parse(data);
            if (nthMessage === 2)
              expect(parsed.users).to.deep.equal([{nick: "first"},
                                                  {nick: "second"}]);
            if (nthMessage === 3) {
              expect(parsed.users).to.deep.equal([{nick: "first"}]);
              ws.close();
              done();
            }

            nthMessage++;
          });

          webSocket.on('open', function() {
            signin('second', function() {
              ws = new WebSocket(socketURL('second'));
              ws.on('open', signout.bind(this, 'second'));
            });
          });
        });
      });

    it("should signs out a user when his websocket drops out", function(done) {
      var nthMessage = 1;

      signin('user', function() {
        webSocket = new WebSocket(socketURL('user'));

        webSocket.on('error', function(error) {
          expect(error).to.equal(null);
        });

        webSocket.on('open', function() {
          signin('another', function() {
            var ws = new WebSocket(socketURL('another'));
            ws.on('open', webSocket.close.bind(webSocket));
            ws.on('message', function(data) {
              var parsed = JSON.parse(data);
              if (nthMessage === 2) {
                expect(parsed.users).to.deep.equal([{nick: "another"}]);
                ws.close();
                done();
              }
              nthMessage ++;
            });
          });
        });
      });
    });

  });

  describe("call offer", function() {
    var callerWs,
        calleeWs,
        messages = {callee: [], caller: []};

    beforeEach(function(done) {
      app.start(serverPort, function() {
        var nbCalls = 1;

        // Triggers `done` when called twice, i.e. when the two
        // websockets can receive messages
        function websocketsOpen() {
          if (nbCalls === 2)
            done();
          nbCalls++;
        }

        function noerror(err) {
          expect(err).to.be.a('null');
        }

        signin('first', function() {
          callerWs = new WebSocket(socketURL('first'));
          callerWs.on('open', websocketsOpen);
          callerWs.on('error', noerror);
        });

        signin('second', function() {
          calleeWs = new WebSocket(socketURL('second'));
          calleeWs.on('open', websocketsOpen);
          calleeWs.on('error', noerror);
        });
      });
    });

    afterEach(function(done) {
      messages = {callee: [], caller: []};
      app.shutdown();
      callerWs.close();
      calleeWs.close();
      done();
    });

    it("should notify a user that another is trying to call them",
      function(done) {
        // TODO: Change event names (incoming_call => incomingCall)
        /*jshint camelcase:false*/
        calleeWs.on('message', function(data) {
          var message = JSON.parse(data);

          if (message.incoming_call) {
            expect(message).to.be.an('object');
            expect(message.incoming_call.caller).to.equal('first');
            done();
          }
        });

        callerWs.send(JSON.stringify({
          "call_offer": { caller: "first", callee: "second" }
        }));
      });

    it("should notify a user that a call has been accepted",
      function(done) {
        // TODO: Change event names (call_accepted => callAccepted)
        /*jshint camelcase:false*/
        callerWs.on('message', function(data) {
          var message = JSON.parse(data);

          if (message.call_accepted) {
            expect(message).to.be.an('object');
            expect(message.call_accepted.caller).to.equal('first');
            done();
          }
        });

        calleeWs.send(JSON.stringify({
          "call_accepted": { caller: "first", callee: "second" }
        }));
      });
  });
});
