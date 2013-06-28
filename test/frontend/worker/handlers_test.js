/* global afterEach, beforeEach, chai, describe, sinon, it,
   ports:true, Port, PortCollection, handlers, _currentUserData:true,
   currentConversation:true, UserData, _presenceSocket:true, tryPresenceSocket,
   browserPort:true, currentUsers:true, _presenceSocketSendMessage,
   Conversation */
/* jshint expr:true */

var expect = chai.expect;

describe('handlers', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should remove a closed port on receiving social.port-closing",
    function() {
      ports = new PortCollection();
      var port = new Port({_portid: 42});
      ports.add(port);
      handlers['social.port-closing'].bind(port)();
      expect(Object.keys(ports.ports)).to.have.length.of(0);
    });

  describe("talkilla.login", function() {
    var xhr, rootURL, socketStub, requests;

    beforeEach(function() {
      socketStub = sinon.stub(window, "createPresenceSocket");
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
    });

    afterEach(function() {
      _currentUserData = undefined;
      xhr.restore();
      socketStub.restore();
    });

    it("should call postEvent with a failure message if I pass in bad data",
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

    describe("Accepted Login", function() {
      var port;

      beforeEach(function() {
        port = {id: "tests", postEvent: sandbox.spy()};
        ports.add(port);

        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {username: "jb"}
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

      it("should post a success message if the server accepted login",
        function() {
          sinon.assert.calledOnce(port.postEvent);
          sinon.assert.calledWith(port.postEvent, "talkilla.login-success");
          ports.remove(port);
        });

      it("should store the username if the server accepted login",
        function() {
          expect(_currentUserData.userName).to.equal('jb');
        });
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

    it("should notify new sidebars of current users",
      function() {
        _currentUserData.userName = "jb";
        currentUsers = {};
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.calledWith(handlers.postEvent, "talkilla.users");
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

    it('should post an error message if not logged in', function() {
      _currentUserData.userName = undefined;
      handlers.postEvent = sandbox.spy();
      handlers['talkilla.logout']({
        topic: 'talkilla.logout',
        data: null
      });

      sinon.assert.calledOnce(handlers.postEvent);
      sinon.assert.calledWith(handlers.postEvent, 'talkilla.error');
    });

    it('should tear down the websocket', function() {
      handlers['talkilla.logout']({
        topic: 'talkilla.logout',
        data: null
      });

      sinon.assert.calledOnce(_presenceSocket.close);
    });

    it("should post an ajax message to the server",
      function() {
        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
        expect(requests.length).to.equal(1);
        expect(requests[0].url).to.equal('/signout');
        expect(requests[0].requestBody).to.be.not.empty;
        expect(requests[0].requestBody).to.be.equal('{"nick":"romain"}');
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

    it("should open create a new conversation object when receiving a " +
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
        windowOpened: sandbox.stub()
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

  describe("talkilla.offer-timeout", function() {
    it("should notify the caller that an outgoing call did not go through",
      function() {
        var fakeCallData = {foo: "bar"};
        sandbox.stub(ports, "broadcastEvent");

        handlers['talkilla.offer-timeout']({
          topic: "talkilla.offer-timeout",
          data: fakeCallData
        });

        sinon.assert.calledOnce(ports.broadcastEvent);
        sinon.assert.calledWithExactly(ports.broadcastEvent,
          "talkilla.offer-timeout", fakeCallData);
      });
  });

  describe("talkilla.sidebar-ready", function() {

    beforeEach(function() {
      _currentUserData = new UserData();
    });

    afterEach(function() {
      _currentUserData = undefined;
    });

    it("should call tryPresenceSocket when receiving" +
       "a talkilla.sidebar-ready event", function () {
      sandbox.stub(window, "tryPresenceSocket");

      handlers['talkilla.sidebar-ready']({
        topic: "talkilla.sidebar-ready",
        data: {nick: "toto"}
      });

      sinon.assert.calledOnce(tryPresenceSocket);
      sinon.assert.calledWithExactly(tryPresenceSocket, "toto");
    });

    it("should NOT call tryPresenceSocket if there is no nick provided",
      function () {
        sandbox.stub(window, "tryPresenceSocket");

        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.notCalled(tryPresenceSocket);
      });
  });

  describe("talkilla.call-offer", function() {
    it("should send a websocket message when receiving talkilla.call-offer",
      function() {
        sandbox.stub(window, "_presenceSocketSendMessage");
        var data = {
          peer: "tom",
          offer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-offer']({
          topic: "talkilla.call-offer",
          data: data
        });

        sinon.assert.calledOnce(_presenceSocketSendMessage);
        sinon.assert.calledWithExactly(_presenceSocketSendMessage,
         JSON.stringify({'call_offer': data }));
      });
  });

  describe("talkilla.call-answer", function() {
    it("should send a websocket message when receiving talkilla.call-answer",
      function() {
        sandbox.stub(window, "_presenceSocketSendMessage");
        var data = {
          peer: "fred",
          offer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-answer']({
          topic: "talkilla.call-answer",
          data: data
        });

        sinon.assert.calledOnce(_presenceSocketSendMessage);
        sinon.assert.calledWithExactly(_presenceSocketSendMessage,
         JSON.stringify({ 'call_accepted': data }));
      });
  });

  describe("talkilla.call-hangup", function() {
    afterEach(function() {
      currentConversation = undefined;
    });

    it("should send a websocket message when receiving talkilla.call-hangup",
      function() {
        sandbox.stub(window, "_presenceSocketSendMessage");
        var data = {
          peer: "florian"
        };

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: data
        });

        sinon.assert.calledOnce(_presenceSocketSendMessage);
        sinon.assert.calledWithExactly(_presenceSocketSendMessage,
         JSON.stringify({ 'call_hangup': data }));
      });

    it("should reset the call data when receiving talkilla.call-hangup",
      function() {
        currentConversation = {data: "fake"};
        sandbox.stub(window, "_presenceSocketSendMessage");
        var data = {
          peer: "florian"
        };

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: data
        });

        expect(currentConversation).to.be.equal(undefined);
      });
  });

});
