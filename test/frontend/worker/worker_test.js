/* global afterEach, beforeEach, chai, describe,
   it, sinon, _config:true,
   _presenceSocket:true, loadconfig, ports:true,
   _presenceSocketOnMessage, _presenceSocketOnError,
   _presenceSocketOnClose,
   _presenceSocketOnOpen, _signinCallback,
   browserPort:true, _currentUserData:true, UserData,
   tryPresenceSocket,
   _presenceSocketReAttached, _loginExpired, _setupWebSocket,
   _ */
var expect = chai.expect;

describe('Worker', function() {
  "use strict";
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function () {
    browserPort = null;
    sandbox.restore();
  });

  describe("#loadconfig", function() {
    var oldConfig, xhr, requests;

    beforeEach(function() {
      oldConfig = _.clone(_config);
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      _config = {};
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };
    });

    afterEach(function() {
      _config = oldConfig;
      xhr.restore();
    });

    it("should populate the _config object from using AJAX load",
      function(done) {
        expect(_config).to.deep.equal({});
        loadconfig(function(err, config) {
          expect(requests).to.have.length.of(1);
          expect(requests[0].url).to.equal('/config.json');
          expect(config).to.deep.equal({WSURL: 'ws://fake', DEBUG: true});
          done();
        });
        requests[0].respond(200, {
          'Content-Type': 'application/json'
        }, '{"WSURL": "ws://fake", "DEBUG": true}');
      });
  });

  describe("#_signinCallback", function() {
    var socketStub, wsurl = 'ws://fake', testableCallback;

    beforeEach(function() {
      sandbox.stub(window, "WebSocket");
      socketStub = sinon.stub(window, "createPresenceSocket");
      _config.WSURL = wsurl;
      _currentUserData = new UserData({});
      sandbox.stub(_currentUserData, "send");
      testableCallback = _signinCallback.bind({postEvent: function(){}});
    });

    afterEach(function() {
      _currentUserData = undefined;
      socketStub.restore();
    });

    it("should initiate the presence connection if signin succeded",
      function() {
        var nickname = "bill";
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.calledOnce(socketStub);
        sinon.assert.calledWithExactly(socketStub, nickname);
      });

    it("should not initiate the presence connection if signin failed",
      function() {
        var nickname;
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.notCalled(socketStub);
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

});
