/* global afterEach, beforeEach, chai, createPresenceSocket, describe,
   handlers, it, sinon, Port, PortCollection, _config, _presenceSocket,
   loadconfig, ports:true */
/* jshint expr:true */
var expect = chai.expect;

describe('Worker', function() {
  "use strict";

  describe("#loadconfig", function() {
    var oldConfig, xhr, requests, sandbox;

    beforeEach(function() {
      oldConfig = _config;
      sandbox = sinon.sandbox.create();
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
      sandbox.restore();
    });

    it("should populate the _config object from using AJAX load", function() {
      expect(_config).to.deep.equal({});
      loadconfig();
      expect(requests).to.have.length.of(1);
      expect(requests[0].url).to.equal('/config.json');
      requests[0].respond(200, {
        'Content-Type': 'application/json'
      }, '{"WSURL": "ws://fake", "DEBUG": true}');
      expect(_config).to.deep.equal({WSURL: 'ws://fake', DEBUG: true});
    });
  });

  describe('#createPresenceSocket', function() {
    var sandbox;
    var wsurl = "ws://example.com/";

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      _config.WSURL = wsurl;
      sandbox.stub(window, "WebSocket");
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should create a socket with a URL from the nick and _config.WSURL",
      function() {
      expect(_presenceSocket).to.equal(undefined);

      var nickname = "bill";
      createPresenceSocket(nickname);

      expect(_presenceSocket).to.be.an.instanceOf(WebSocket);

      sinon.assert.calledOnce(WebSocket);
      sinon.assert.calledWithExactly(WebSocket, wsurl + "?nick=" + nickname);
      // XXX test onclose, onerrror, etc.
    });

  });

  describe('Port', function() {
    it("should accept and configure a port", function() {
      var port = new Port({_portid: 1});
      expect(port.id).to.equal(1);
      expect(port.port.onmessage).to.be.a('function');
    });

    it("should post a message", function() {
      var spy = sinon.spy();
      var port = new Port({_portid: 1, postMessage: spy});
      port.postEvent('foo', 'bar');
      expect(spy.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
    });

    it("should post an error", function() {
      var spy = sinon.spy();
      var port = new Port({_portid: 1, postMessage: spy});
      port.error('error');
      expect(spy.calledWith({topic: 'talkilla.error', data: 'error'})).to.be.ok;
    });
  });

  describe('PortCollection', function() {
    it("should have empty port stack by default", function() {
      expect(new PortCollection().ports).to.deep.equal({});
    });

    it("should add a configured port to the stack", function() {
      var coll = new PortCollection();
      expect(coll.ports).to.be.a('object');
      expect(Object.keys(coll.ports)).to.have.length.of(0);
      coll.add(new Port({_portid: 1}));
      expect(Object.keys(coll.ports)).to.have.length.of(1);
      expect(coll.ports[1]).to.be.a('object');
      expect(coll.ports[1]).to.include.keys(['port', 'id']);
    });

    it("should find a port by its identifier", function() {
      var coll = new PortCollection();
      coll.add(new Port({_portid: 1}));
      coll.add(new Port({_portid: 42}));
      expect(coll.find(1).id).to.equal(1);
      expect(coll.find(42).id).to.equal(42);
      expect(coll.find(99)).to.be.a('undefined');
    });

    it("should not add the same port twice", function() {
      var coll = new PortCollection();
      var port = new Port({_portid: 1});
      coll.add(port);
      coll.add(port);
      expect(Object.keys(coll.ports)).to.have.length.of(1);
    });

    it("should be able to remove a port from the collection", function() {
      var coll = new PortCollection();
      var port1 = new Port({_portid: 1});
      coll.add(port1);
      coll.add(new Port({_portid: 2}));
      expect(Object.keys(coll.ports)).to.have.length.of(2);
      coll.remove(port1);
      expect(Object.keys(coll.ports)).to.have.length.of(1);
    });

    it("should find a port and post a message to it", function() {
      var coll = new PortCollection();
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      coll.add(new Port({_portid: 1, postMessage: spy1}));
      coll.add(new Port({_portid: 2, postMessage: spy2}));
      coll.find(2).postEvent('foo', 'bar');
      expect(spy1.called).to.equal(false);
      expect(spy2.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
    });

    it("should broadcast a message to all ports", function() {
      var coll = new PortCollection();
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      coll.add(new Port({_portid: 1, postMessage: spy1}));
      coll.add(new Port({_portid: 2, postMessage: spy2}));
      coll.broadcastEvent('foo', 'bar');
      expect(spy1.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
      expect(spy2.calledWith({topic: 'foo', data: 'bar'})).to.be.ok;
    });

    it("should broadcast an error to all ports", function() {
      var coll = new PortCollection();
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();
      coll.add(new Port({_portid: 1, postMessage: spy1}));
      coll.add(new Port({_portid: 2, postMessage: spy2}));
      coll.broadcastError('error');
      expect(spy1.calledWith({topic: 'talkilla.error',
                              data: 'error'})).to.be.ok;
      expect(spy2.calledWith({topic: 'talkilla.error',
                              data: 'error'})).to.be.ok;
    });
  });

  describe('Handlers', function() {
    it("should remove a closed port from the current collection", function() {
      ports = new PortCollection();
      var port = new Port({_portid: 42});
      ports.add(port);
      handlers['social.port-closing'].bind(port)();
      expect(Object.keys(ports.ports)).to.have.length.of(0);
    });
  });

  describe("#login", function() {
    var xhr, requests, sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };
    });

    afterEach(function() {
      xhr.restore();
      sandbox.restore();
    });

    it("should call postEvent with a failure message if i pass in bad data",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.login']({topic: "talkilla.login", data: null});
        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");
      });

    it("should call postEvent with a pending message if I pass in valid data",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-pending");
      });

    it("should post an ajax message to the server if I pass valid login data",
      function() {
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal('/signin');
        expect(requests[0].requestBody).to.be.not.empty;
        expect(requests[0].requestBody).to.be.equal('{"nick":"jb"}');
      });

    it.skip("should create the presence socket if I pass valid login data",
      function() {
        sandbox.stub(window, "createPresenceSocket"); // XXX
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });

        sinon.assert.calledOnce(createPresenceSocket);
        sinon.assert.calledWithExactly("jb");
      });

    it("should post a success message if the server accepted login",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);

        requests[0].respond(200, { 'Content-Type': 'application/json' },
          '{"nick":"jb"}' );

        sinon.assert.calledTwice(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-success");
      });

    it("should post a fail message if the server rejected login",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
        });
        expect(requests.length).to.equal(1);

        requests[0].respond(401, { 'Content-Type': 'text/plain' },
                            'Not Authorised' );

        sinon.assert.calledTwice(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");

      });
  });

  describe("#logout", function() {
    it('should tear down the websocket');
  });

  // XXX need to check that websocket torn down if connection lost,
  // but that test doesn't really belong here.  Not sure where it wants
  // to live

});
