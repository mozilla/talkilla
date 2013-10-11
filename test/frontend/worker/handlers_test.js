/*global chai, sinon, ports:true, Port, PortCollection, handlers,
  _currentUserData:true, currentConversation:true, UserData,
  _presenceSocket:true, browserPort:true, tkWorker,
  Conversation, _loginPending:true, _autologinPending:true,
  _cookieNickname:true, SPA, spa:true, _signinCallback */
/* jshint expr:true */

var expect = chai.expect;

describe('handlers', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "SPAPort");
    sandbox.stub(window, "Server");
    sandbox.stub(window, "Worker").returns({postMessage: sinon.spy()});
    spa = new SPA({src: "example.com"});
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
    beforeEach(function() {
      _cookieNickname = undefined;
    });

    afterEach(function() {
      _cookieNickname = undefined;
    });

    it("should try to connect the presence socket",
      function() {
        _currentUserData = {};
        sandbox.stub(spa, "autoconnect");
        var event = {
          data: [ {name: "nick", value: "Boriss"} ]
        };

        handlers['social.cookies-get-response'](event);

        sinon.assert.calledOnce(spa.autoconnect);
        sinon.assert.calledWithExactly(spa.autoconnect, "Boriss");
      });

    it("should NOT try to connect if there is no nick provided",
      function () {
        sandbox.stub(spa, "autoconnect");

        handlers['social.cookies-get-response']({
          topic: "social.cookies-get-response",
          data: []
        });

        sinon.assert.notCalled(spa.autoconnect);
      });

  });

  describe("talkilla.contacts", function() {
    it("should update current users list with provided contacts", function() {
      sandbox.stub(tkWorker, "updateContactList");
      var contacts = [{username: "foo"}, {username: "bar"}];

      handlers['talkilla.contacts']({
        topic: "talkilla.contacts",
        data: {contacts: contacts}
      });

      sinon.assert.calledOnce(tkWorker.updateContactList);
      sinon.assert.calledWithExactly(tkWorker.updateContactList, contacts);
    });
  });

  describe("talkilla.login", function() {
    var xhr, rootURL, socketStub, requests;

    beforeEach(function() {
      socketStub = sinon.stub(spa, "connect");
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

    it("should post ask the spa to signin",
      function() {
        sandbox.stub(spa, "signin");
        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
        sinon.assert.calledOnce(spa.signin);
        sinon.assert.calledOnce(spa.signin, "fake assertion");
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
          sandbox.stub(spa, "signin", function(assertion, callback) {
            handlers.postEvent.reset();

            callback("error", "{}");
            sinon.assert.calledOnce(handlers.postEvent);
            sinon.assert.calledWith(
              handlers.postEvent, "talkilla.login-failure");
          });

          handlers['talkilla.login']({
            topic: "talkilla.login",
            data: {assertion: "fake assertion"}
          });
        });
    });

    describe("Accepted Login", function() {
      var port;

      beforeEach(function() {
        port = {id: "tests", postEvent: sandbox.spy()};
        ports.add(port);
        sandbox.stub(spa, "signin", function(nick, callback) {
          callback(null, '{"nick":"jb"}');
        });

        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
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

    it("should post an ajax message to the spa",
      function() {
        sandbox.stub(spa, "signout");
        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
        sinon.assert.calledOnce(spa.signout);
      });

    describe("Success logout", function() {
      var port;

      beforeEach(function () {
        port = {id: "tests", postEvent: sandbox.spy()};
        ports.add(port);
        sandbox.stub(spa, "signout", function(nick, callback) {
          callback(null, "OK");
        });
        sandbox.stub(_currentUserData, "reset");

        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
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
        sandbox.stub(spa, "signout", function(nick, callback) {
          callback("error", "Not Authorised");
        });
        handlers.postEvent = sandbox.spy();
        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
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

        sinon.assert.called(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.login-success");
      });

    it("should notify new sidebars only if there's a logged in user",
      function() {
        sandbox.stub(spa, "autoconnect");
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.notCalled(spa.autoconnect);
      });
    it("should notify new sidebars only if there's a logged in user",
      function() {
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.calledOnce(handlers.postEvent);
        sinon.assert.calledWith(handlers.postEvent, "talkilla.worker-ready");
      });


  });

  describe("talkilla.presence-request", function () {
    beforeEach(function() {
      _currentUserData = new UserData();
      sandbox.stub(_currentUserData, "send");
      sandbox.stub(spa, "presenceRequest");
    });

    afterEach(function() {
      _currentUserData = null;
    });

    it("should notify new sidebars of current users",
      function() {
        _currentUserData.userName = "jb";
        _presenceSocket = {send: sinon.spy()};
        tkWorker.currentUsers = {};
        handlers.postEvent = sinon.spy();
        handlers['talkilla.presence-request']({
          topic: "talkilla.presence-request",
          data: {}
        });

        sinon.assert.calledWith(handlers.postEvent, "talkilla.users");
      });

    it("should request for the initial presence state " +
       "if there is no current users", function() {
        tkWorker.currentUsers = {};
        handlers['talkilla.presence-request']({
          topic: "talkilla.presence-request",
          data: {}
        });

        sinon.assert.calledOnce(spa.presenceRequest);
      });

  });

  describe("talkilla.call-offer", function() {

    it("should post an offer when receiving a talkilla.call-offer event",
      function() {
        _currentUserData = {userName: "tom"};
        sandbox.stub(spa, "callOffer");
        var data = {
          peer: "tom",
          offer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-offer']({
          topic: "talkilla.call-offer",
          data: data
        });

        sinon.assert.calledOnce(spa.callOffer);
        sinon.assert.calledWithExactly(
          spa.callOffer, data.offer, data.peer, undefined);
      });
  });

  describe("talkilla.call-answer", function() {
    it("should send a websocket message when receiving talkilla.call-answer",
      function() {
        _currentUserData = {userName: "fred"};
        sandbox.stub(spa, "callAnswer");
        var data = {
          peer: "fred",
          answer: { sdp: "sdp", type: "type" }
        };

        handlers['talkilla.call-answer']({
          topic: "talkilla.call-answer",
          data: data
        });

        sinon.assert.calledOnce(spa.callAnswer);
        sinon.assert.calledWithExactly(
          spa.callAnswer, data.answer, data.peer, undefined);
      });
  });

  describe("talkilla.call-hangup", function() {
    afterEach(function() {
      currentConversation = undefined;
    });

    it("should send a websocket message when receiving talkilla.call-hangup",
      function() {
        _currentUserData = {userName: "florian"};
        sandbox.stub(spa, "callHangup");
        var data = {
          peer: "florian"
        };

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: data
        });

        sinon.assert.calledOnce(spa.callHangup);
        sinon.assert.calledWithExactly(spa.callHangup, "florian");
      });
  });

});
