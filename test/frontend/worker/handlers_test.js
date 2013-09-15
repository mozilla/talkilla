/*global chai, sinon, ports:true, Port, PortCollection, handlers,
  _currentUserData:true, currentConversation:true, UserData,
  _presenceSocket:true, browserPort:true, currentUsers:true,
  Conversation, _config:true, _loginPending:true, _autologinPending: true,
  _cookieNickname:true, Server, server:true, _signinCallback */
/* jshint expr:true */

var expect = chai.expect;

describe('handlers', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    server = new Server({});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("social.port-closing", function() {
    var port;

    beforeEach(function() {
      ports = new PortCollection();
      port = new Port({_portid: 42});
      ports.add(port);

      browserPort = {postEvent: sandbox.spy()};
    });

    afterEach(function() {
      currentConversation = undefined;
      browserPort = undefined;
    });

    it("should remove a closed port on receiving social.port-closing",
      function() {
        handlers['social.port-closing'].bind(port)();
        expect(Object.keys(ports.ports)).to.have.length.of(0);
      });

    it("should clear the current conversation on receiving " +
       "social.port-closing for the conversation port", function() {
        currentConversation = new Conversation();
        currentConversation.port = port;

        handlers['social.port-closing'].bind(port)();
        expect(currentConversation).to.be.equal(undefined);
      });
  });

  describe("social.cookies-get-response", function() {
    var oldConfig;

    beforeEach(function() {
      oldConfig = _config;
      _cookieNickname = undefined;
    });

    afterEach(function() {
      _config = oldConfig;
      _cookieNickname = undefined;
    });

    it("should try to connect the presence socket",
      function() {
        _currentUserData = {};
        sandbox.stub(server, "autoconnect");
        var event = {
          data: [ {name: "nick", value: "Boriss"} ]
        };

        handlers['social.cookies-get-response'](event);

        sinon.assert.calledOnce(server.autoconnect);
        sinon.assert.calledWithExactly(server.autoconnect, "Boriss");
      });

    it("should NOT try to connect if there is no nick provided",
      function () {
        sandbox.stub(server, "autoconnect");

        handlers['social.cookies-get-response']({
          topic: "social.cookies-get-response",
          data: []
        });

        sinon.assert.notCalled(server.autoconnect);
      });

  });

  describe("talkilla.login", function() {
    var xhr, rootURL, socketStub, requests;

    beforeEach(function() {
      socketStub = sinon.stub(server, "connect");
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };

      rootURL = 'http://fake';
      _currentUserData = new UserData({}, {
        ROOTURL: rootURL
      });
      sandbox.stub(_currentUserData, "send");
      _loginPending = _autologinPending = false;
    });

    afterEach(function() {
      _currentUserData = undefined;
      xhr.restore();
      socketStub.restore();
    });

    it("should call postEvent with a pending message if I pass in valid data",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-pending");
      });

    it("should post an ajax message to the server if I pass valid login data",
      function() {
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal('/signin');
        expect(requests[0].requestBody).to.be.not.empty;
        expect(requests[0].requestBody)
          .to.be.equal('{"assertion":"fake assertion"}');
      });

    it("should not do anything if a login is already pending", function() {
      _loginPending = true;
      sandbox.stub(window, "_signinCallback");
      handlers.postEvent = sandbox.spy();

      handlers['talkilla.login']({
        topic: "talkilla.login",
        data: {assertion: "fake assertion"}
      });

      sinon.assert.notCalled(handlers.postEvent);
      sinon.assert.notCalled(_signinCallback);
    });

    it("should not do anything if an auto login is already pending",
      function() {
        _autologinPending = true;
        sandbox.stub(window, "_signinCallback");
        handlers.postEvent = sandbox.spy();

        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });

        sinon.assert.notCalled(handlers.postEvent);
        sinon.assert.notCalled(_signinCallback);
      });

    describe("Failed login", function() {
      it("should call postEvent with a failure message if I pass in bad data",
        function() {
          handlers.postEvent = sandbox.spy();
          handlers['talkilla.login']({topic: "talkilla.login", data: null});
          sinon.assert.calledOnce(handlers.postEvent);
          sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");
        });

      it("should post a fail message if the server rejected login",
        function() {
          handlers.postEvent = sinon.spy();
          handlers['talkilla.login']({
            topic: "talkilla.login",
            data: {assertion: "fake assertion"}
          });
          expect(requests.length).to.equal(1);

          requests[0].respond(401, {'Content-Type': 'text/plain'},
                              JSON.stringify({error: "some error"}));

          // This gets called twice - once for login-pending, tested elsewhere,
          // and once for the actual login-failure.
          sinon.assert.calledTwice(handlers.postEvent);
          sinon.assert.calledWith(handlers.postEvent, "talkilla.login-failure");
        });
    });

    describe("Accepted Login", function() {
      var port;

      beforeEach(function() {
        port = {id: "tests", postEvent: sandbox.spy()};
        ports.add(port);

        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
        expect(requests.length).to.equal(1);

        requests[0].respond(200, { 'Content-Type': 'application/json' },
          '{"nick":"jb"}' );
      });

      afterEach(function() {
        ports.remove(port);
      });

      it("should store the userName if the server accepted login", function() {
        expect(_currentUserData.userName).to.be.equal("jb");
      });

      it("should set the current user name if the server accepted login",
        function() {
          sinon.assert.calledOnce(_currentUserData.send);
        });

      it("should store the username if the server accepted login",
        function() {
          expect(_currentUserData.userName).to.equal('jb');
        });
    });
  });

  describe("talkilla.logout", function() {
    var xhr, requests;

    beforeEach(function() {
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };

      sandbox.stub(UserData.prototype, "send");
      _currentUserData = new UserData({userName: 'romain'}, {});
      _presenceSocket = { close: sandbox.stub() };
    });

    afterEach(function() {
      _presenceSocket = undefined;
      _currentUserData = undefined;
      xhr.restore();
    });

    it("should post an ajax message to the server",
      function() {
        sandbox.stub(server, "signout");
        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
        sinon.assert.calledOnce(server.signout);
      });

    describe("Success logout", function() {
      var port;

      beforeEach(function () {
        port = {id: "tests", postEvent: sandbox.spy()};
        ports.add(port);

        sandbox.stub(_currentUserData, "reset");

        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });

        requests[0].respond(200, { 'Content-Type': 'text/plain' },
          'OK' );
      });

      afterEach(function() {
        ports.remove(port);
      });

      it("should post a success message",
        function() {
          sinon.assert.calledOnce(port.postEvent);
          sinon.assert.calledWith(port.postEvent, 'talkilla.logout-success');
          ports.remove(port);
        });

      it("should reset the current user data", function() {
        sinon.assert.calledOnce(_currentUserData.reset);
      });
    });

    it("should log failure, if the server failed to sign the user out",
      function() {
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });

        expect(requests.length).to.equal(1);

        requests[0].respond(401, { 'Content-Type': 'text/plain' },
                            'Not Authorised' );

        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, 'talkilla.error');
      });
  });

  describe("talkilla.conversation-open", function() {
    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
    });

    afterEach(function() {
      currentConversation = undefined;
      browserPort = undefined;
    });

    it("should create a new conversation object when receiving a " +
       "talkilla.conversation-open event", function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.conversation-open']({
          topic: "talkilla.conversation-open",
          data: {}
        });

        expect(currentConversation).to.be.an.instanceOf(Conversation);
      });
  });

  describe("talkilla.chat-window-ready", function() {
    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
      _currentUserData = new UserData();
      currentConversation = {
        windowOpened: sandbox.spy()
      };
    });

    afterEach(function() {
      currentConversation = undefined;
      _currentUserData = undefined;
      browserPort = undefined;
    });

    it("should tell the conversation the window has opened when " +
      "receiving a talkilla.chat-window-ready",
      function () {
        var chatAppPort = {postEvent: sinon.spy()};
        _currentUserData.userName = "bob";

        handlers['talkilla.chat-window-ready'].bind(chatAppPort)({
          topic: "talkilla.chat-window-ready",
          data: {}
        });

        sinon.assert.called(currentConversation.windowOpened);
        sinon.assert.calledWithExactly(currentConversation.windowOpened,
          chatAppPort);
      });
  });

  describe("talkilla.sidebar-ready", function() {

    beforeEach(function() {
      _currentUserData = new UserData();
      sandbox.stub(_currentUserData, "send");
    });

    afterEach(function() {
      _currentUserData = undefined;
    });

    it("should notify new sidebars of the logged in user",
      function() {
        _currentUserData.userName = "jb";
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-success");
      });

    it("should notify new sidebars only if there's a logged in user",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.notCalled(handlers.postEvent);
      });

  });

  describe("talkilla.presence-request", function () {
    beforeEach(function() {
      _currentUserData = new UserData();
      sandbox.stub(_currentUserData, "send");
    });

    afterEach(function() {
      _currentUserData = null;
    });

    it("should notify new sidebars of current users",
      function() {
        _currentUserData.userName = "jb";
        _presenceSocket = {send: sinon.spy()};
        currentUsers = {};
        handlers.postEvent = sinon.spy();
        handlers['talkilla.presence-request']({
          topic: "talkilla.presence-request",
          data: {}
        });

        sinon.assert.calledWith(handlers.postEvent, "talkilla.users");
      });

  });

  describe("talkilla.call-offer", function() {
    it("should send a websocket message when receiving talkilla.call-offer",
      function() {
        sandbox.stub(server, "send");
        var data = {
          peer: "tom",
          offer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-offer']({
          topic: "talkilla.call-offer",
          data: data
        });

        sinon.assert.calledOnce(server.send);
        sinon.assert.calledWithExactly(server.send, {'call_offer': data });
      });
  });

  describe("talkilla.call-answer", function() {
    it("should send a websocket message when receiving talkilla.call-answer",
      function() {
        sandbox.stub(server, "send");
        var data = {
          peer: "fred",
          offer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-answer']({
          topic: "talkilla.call-answer",
          data: data
        });

        sinon.assert.calledOnce(server.send);
        sinon.assert.calledWithExactly(server.send, { 'call_accepted': data });
      });
  });

  describe("talkilla.call-hangup", function() {
    afterEach(function() {
      currentConversation = undefined;
    });

    it("should send a websocket message when receiving talkilla.call-hangup",
      function() {
        sandbox.stub(server, "send");
        var data = {
          peer: "florian"
        };

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: data
        });

        sinon.assert.calledOnce(server.send);
        sinon.assert.calledWithExactly(server.send, { 'call_hangup': data });
      });
  });

});
