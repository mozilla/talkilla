/* global afterEach, beforeEach, chai, describe, sinon, it,
   Port, _presenceSocket, ports, _config, createPresenceSocket,
   _presenceSocketOnMessage, _presenceSocketOnError,
   _presenceSocketOnClose, _presenceSocketSendMessage,
   _presenceSocketOnOpen, serverHandlers
 */
/* Needed due to the use of non-camelcase in the websocket topics */
/* jshint camelcase:false */
var expect = chai.expect;

describe('presence socket stuff', function () {
  var spy1, port, sandbox;
  // XXX change shoulds & impls to refer to all ports, rather than a single
  // port, since that's what's being implemented and what we actually want.
  // This probably implies changes to the tests themselves, since that's
  // not what we're currently testing for.

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spy1 = sinon.spy();
    port = new Port({_portid: 1, postMessage: spy1});
    ports.add(port);
  });

  afterEach(function() {
    ports.remove(port);
    sandbox.restore();
  });

  describe('#createPresenceSocket', function() {
    var wsurl = "ws://example.com/";

    beforeEach(function() {
      _config.WSURL = wsurl;
      sandbox.stub(window, "WebSocket");
    });

    it("should configure a socket with a URL from the nick and _config.WSURL",
      function() {
        expect(_presenceSocket).to.equal(undefined);

        var nickname = "bill";
        createPresenceSocket(nickname);

        expect(_presenceSocket).to.be.an.instanceOf(WebSocket);

        sinon.assert.calledOnce(WebSocket);
        sinon.assert.calledWithExactly(WebSocket,
          wsurl + "?nick=" + nickname);
        expect(_presenceSocket.onopen).to.equal(_presenceSocketOnOpen);
        expect(_presenceSocket.onmessage).to.equal(_presenceSocketOnMessage);
        expect(_presenceSocket.onerror).to.equal(_presenceSocketOnError);
        expect(_presenceSocket.onclose).to.equal(_presenceSocketOnClose);
      });

    it("should post a talkilla.presence-pending message",
      function() {
        createPresenceSocket("larry");
        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: {}, topic: "talkilla.presence-pending"});
      });
  });

  describe('#_presenceSocketOnOpen', function() {
    it('should post a talkilla.presence-open message',
      function() {
        var event = {foo: "bar"};
        _presenceSocketOnOpen(event);

        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: event, topic: "talkilla.presence-open"});
      });
  });

  describe('#_presenceSocketOnMessage', function() {

    it("should call postMessage with a JSON version of the received message",
      function() {
        var event = {
          data: JSON.stringify({
            topic: "bar"
          })
        };
        _presenceSocketOnMessage(event);
        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1, {data: "bar",
                                              topic: "talkilla.topic"});
      });

    it("should handle incoming-call internally",
      function() {
        sandbox.stub(serverHandlers, 'incoming_call');
        var event = {
          data: JSON.stringify({
            incoming_call: "bar"
          })
        };
        _presenceSocketOnMessage(event);
        sinon.assert.calledOnce(serverHandlers.incoming_call);
      });
  });

  describe('#_presenceSocketSendMessage', function() {
    var dummySocket;
    var wsurl = "ws://example.com/";

    beforeEach(function() {
      _config.WSURL = wsurl;
      dummySocket = { send: sandbox.spy() };
      sandbox.stub(window, "WebSocket").returns(dummySocket);
    });

    it("should send a message to the WebSocket with the supplied string",
      function() {
        var data = "test";
        createPresenceSocket("larry");
        _presenceSocketSendMessage(data);
        sinon.assert.calledWith(dummySocket.send, data);
      });
  });

  describe('#_presenceSocketOnError', function() {
    it('should call postMessage with a talkilla.websocket-error message',
      function() {
        var event = {foo: "bar"};
        _presenceSocketOnError(event);

        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: event, topic: "talkilla.websocket-error"});
      });
  });

  describe("#_presenceSocketOnClose", function() {
    it('should post a talkilla.presence-unavailable message',
      function() {
        var event = {code: 1000};
        _presenceSocketOnClose(event);

        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: 1000, topic: "talkilla.presence-unavailable"});
      }
    );

    // XXX should we define behavior that is more than simple proxying
    // of the CloseEvent?  E.g. should we null out _presenceSocket?
    // Some first thoughts from Standard8 & dmose at
    // <https://webrtc-apps.etherpad.mozilla.org/35>
  });

});

