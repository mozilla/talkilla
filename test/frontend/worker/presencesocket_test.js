/*global Port, _presenceSocket:true, ports, _config:true,
  _presenceSocketOnMessage, _presenceSocketOnError,
  _presenceSocketOnClose,
  _presenceSocketOnOpen, _presenceSocketReAttached, tryPresenceSocket,
  _setupWebSocket, _loginExpired, UserData, _currentUserData:true,
  serverHandlers, chai, sinon
 */
/* Needed due to the use of non-camelcase in the websocket topics */
/* jshint camelcase:false */
var expect = chai.expect;

describe('presence socket', function () {
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

  describe("#_setupWebSocket", function() {

    it("should attach _presenceSocketOnOpen to the open event", function() {
      var fakeWS = {};

      _setupWebSocket(fakeWS);

      expect(fakeWS.onopen).to.equal(_presenceSocketOnOpen);
    });

    it("should attach _presenceSocketOnMessage to the message event",
      function() {
        var fakeWS = {};

        _setupWebSocket(fakeWS);

        expect(fakeWS.onmessage).to.equal(_presenceSocketOnMessage);
      });

    it("should attach _presenceSocketOnError to the error event", function() {
      var fakeWS = {};

      _setupWebSocket(fakeWS);

      expect(fakeWS.onerror).to.equal(_presenceSocketOnError);
    });

    it("should attach _presenceSocketOnClose to the close event", function() {
      var fakeWS = {};

      _setupWebSocket(fakeWS);

      expect(fakeWS.onclose).to.equal(_presenceSocketOnClose);
    });
  });

  describe('#_presenceSocketOnOpen', function() {
    beforeEach(function () {
      sandbox.stub(UserData.prototype, "send");
      _currentUserData = new UserData({connected: true});
    });

    afterEach(function() {
      _currentUserData = undefined;
    });

    it('should post a talkilla.presence-open message',
      function() {
        var event = {foo: "bar"};
        _presenceSocketOnOpen(event);

        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: event, topic: "talkilla.presence-open"});
      });

    it('should inform user data that the user is connected', function() {
      var event = {foo: "bar"};
      _presenceSocketOnOpen(event);

      expect(_currentUserData.connected).to.be.equal(true);
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
    beforeEach(function () {
      sandbox.stub(UserData.prototype, "send");
      _currentUserData = new UserData({connected: true});
    });

    afterEach(function() {
      _currentUserData = undefined;
    });

    it('should post a talkilla.presence-unavailable message',
      function() {
        var event = {code: 1000};
        _presenceSocketOnClose(event);

        sinon.assert.calledOnce(spy1);
        sinon.assert.calledWithExactly(spy1,
          {data: 1000, topic: "talkilla.presence-unavailable"});
      });

    it('should inform user data that the user is disconnected', function() {
      var event = {code: 1000};
      _presenceSocketOnClose(event);

      expect(_currentUserData.connected).to.be.equal(false);
    });

    // XXX should we define behavior that is more than simple proxying
    // of the CloseEvent?  E.g. should we null out _presenceSocket?
    // Some first thoughts from Standard8 & dmose at
    // <https://webrtc-apps.etherpad.mozilla.org/35>
  });

  describe("#_loginExpired", function() {

    beforeEach(function () {
      _presenceSocket = {removeEventListener: sinon.spy()};
    });

    it("should remove itself from the listeners", function () {
      _loginExpired();

      sinon.assert.calledOnce(_presenceSocket.removeEventListener);
      sinon.assert.calledWithExactly(
        _presenceSocket.removeEventListener, "error", _loginExpired);
    });

    it("should broadcast a talkilla.logout-success event", function () {
      sandbox.stub(window.ports, "broadcastEvent");

      _loginExpired();

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.logout-success", {});
    });

  });

  describe("#_presenceSocketReAttached", function () {

    beforeEach(function () {
      _presenceSocket = {removeEventListener: sinon.spy()};
      sandbox.stub(UserData.prototype, "send");
      _currentUserData = new UserData();
    });

    afterEach(function () {
      _currentUserData = undefined;
    });

    it("should remove itself from the listeners", function () {
      _presenceSocketReAttached("toto");

      sinon.assert.calledOnce(_presenceSocket.removeEventListener);
      sinon.assert.calledWithExactly(
        _presenceSocket.removeEventListener, "open", _presenceSocketReAttached);
    });

    it("should setup the websocket", function () {
      sandbox.stub(window, "_setupWebSocket");
      sandbox.stub(window, "_presenceSocketOnOpen");

      _presenceSocketReAttached();

      sinon.assert.calledOnce(_setupWebSocket);
    });

    it("should call _presenceSocketOnOpen forwarding the given event",
      function () {
        sandbox.stub(window, "_presenceSocketOnOpen");

        _presenceSocketReAttached("nickname", "event");

        sinon.assert.calledOnce(_presenceSocketOnOpen);
        sinon.assert.calledWithExactly(_presenceSocketOnOpen, "event");
      });

    it("should broadcast a talkilla.login-success event", function () {
      sandbox.stub(window.ports, "broadcastEvent");
      sandbox.stub(window, "_presenceSocketOnOpen");

      _presenceSocketReAttached("toto");

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.login-success", {username: "toto"});
    });

  });

  describe("#tryPresenceSocket", function() {
    var wsurl = "ws://example.com/", oldConfig;

    beforeEach(function() {
      oldConfig = _.clone(_config);
      _config.WSURL = wsurl;
    });

    afterEach(function() {
      _config = oldConfig;
    });

    it("should create a websocket and attach it to _presenceSocket",
      function() {
        var fakeWS = {addEventListener: function () {}};
        var url = wsurl + "?nick=toto";
        sandbox.stub(window, "WebSocket").returns(fakeWS);

        tryPresenceSocket("toto");

        expect(_presenceSocket).to.equal(fakeWS);
        sinon.assert.calledOnce(window.WebSocket);
        sinon.assert.calledWithExactly(window.WebSocket, url);
      });

    it("should attach _presenceSocketReAttached to the open event",
      function() {
        var nbCall = 1;

        var fakeWS = {
          addEventListener: function(eventname, callback) {
            if (nbCall === 1) {
              expect(eventname).to.equal("open");
              callback();
              sinon.assert.calledOnce(_presenceSocketReAttached);
              sinon.assert.calledWithExactly(_presenceSocketReAttached, "toto");
            }
            nbCall += 1;
          }
        };

        sandbox.stub(window, "WebSocket").returns(fakeWS);
        sandbox.stub(window, "_presenceSocketReAttached");
        sandbox.stub(window.ports, "broadcastEvent");

        tryPresenceSocket("toto");
      });

    it("should attach _loginExpired to the error event", function() {
      var fakeWS = {addEventListener: sinon.spy()};
      sandbox.stub(window, "WebSocket").returns(fakeWS);
      sandbox.stub(window.ports, "broadcastEvent");

      tryPresenceSocket("toto");

      sinon.assert.called(fakeWS.addEventListener);
      sinon.assert.calledWithExactly(
        fakeWS.addEventListener, "error", _loginExpired);
    });

    it("should send a talkilla.presence-pending event", function() {
      var fakeWS = {addEventListener: function() {}};
      sandbox.stub(window, "WebSocket").returns(fakeWS);
      sandbox.stub(window.ports, "broadcastEvent");

      tryPresenceSocket("toto");

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.presence-pending", {});
    });
  });

});

