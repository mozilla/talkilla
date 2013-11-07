/*global chai, sinon, Port, handlers, currentConversation:true, UserData,
  _presenceSocket:true, browserPort:true, tkWorker, Conversation,
  _loginPending:true, _autologinPending:true, _cookieNickname:true, SPA,
  spa:true, _signinCallback, payloads */
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
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function() {
    sandbox.restore();
    browserPort = undefined;
  });

  describe("social.port-closing", function() {
    var port;

    beforeEach(function() {
      port = new Port({_portid: 42});
      tkWorker.ports.add(port);
    });

    afterEach(function() {
      currentConversation = undefined;
    });

    it("should remove a closed port on receiving social.port-closing",
      function() {
        handlers['social.port-closing'].bind(port)();
        expect(Object.keys(tkWorker.ports.ports)).to.have.length.of(0);
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
        tkWorker.user.reset();
        sandbox.stub(spa, "connect");
        var event = {
          data: [ {name: "nick", value: "Boriss"} ]
        };

        handlers['social.cookies-get-response'](event);

        sinon.assert.calledOnce(spa.connect);
        sinon.assert.calledWithExactly(spa.connect);
      });

    it("should NOT try to connect if there is no nick provided",
      function () {
        sandbox.stub(spa, "connect");

        handlers['social.cookies-get-response']({
          topic: "social.cookies-get-response",
          data: []
        });

        sinon.assert.notCalled(spa.connect);
      });

  });

  describe("talkilla.contacts", function() {
    it("should update contacts list with provided contacts", function() {
      sandbox.stub(tkWorker, "updateContactsFromSource");
      var contacts = [{username: "foo"}, {username: "bar"}];

      handlers['talkilla.contacts']({
        topic: "talkilla.contacts",
        data: {contacts: contacts, source: "google"}
      });

      sinon.assert.calledOnce(tkWorker.updateContactsFromSource);
      sinon.assert.calledWithExactly(tkWorker.updateContactsFromSource,
                                     contacts, "google");
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
      tkWorker.user = new UserData({}, {
        ROOTURL: rootURL
      });
      sandbox.stub(tkWorker.user, "send");
      _loginPending = _autologinPending = false;
    });

    afterEach(function() {
      tkWorker.user.reset();
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
        tkWorker.ports.add(port);
        sandbox.stub(spa, "signin", function(assertion, callback) {
          callback(null, '{"nick":"jb"}');
        });

        handlers['talkilla.login']({
          topic: "talkilla.login",
          data: {assertion: "fake assertion"}
        });
      });

      afterEach(function() {
        tkWorker.ports.remove(port);
      });

      it("should store the name if the server accepted login", function() {
        expect(tkWorker.user.name).to.be.equal("jb");
      });

      it("should set the current user name if the server accepted login",
        function() {
          sinon.assert.calledOnce(tkWorker.user.send);
        });

      it("should store the username if the server accepted login",
        function() {
          expect(tkWorker.user.name).to.equal('jb');
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
      tkWorker.user = new UserData({name: 'romain'}, {});
      _presenceSocket = { close: sandbox.stub() };
    });

    afterEach(function() {
      _presenceSocket = undefined;
      tkWorker.user.reset();
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
        tkWorker.ports.add(port);
        sandbox.stub(spa, "signout", function(callback) {
          callback(null, "OK");
        });
        sandbox.stub(tkWorker.user, "reset");
        sandbox.stub(tkWorker, "closeSession");

        handlers['talkilla.logout']({
          topic: 'talkilla.logout'
        });
      });

      afterEach(function() {
        tkWorker.ports.remove(port);
      });

      it("should close current worker session", function() {
        sinon.assert.calledOnce(tkWorker.closeSession);
      });
    });

    it("should log failure, if the server failed to sign the user out",
      function() {
        sandbox.stub(spa, "signout", function(callback) {
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
    afterEach(function() {
      currentConversation = undefined;
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
      tkWorker.user = new UserData();
      currentConversation = {
        windowOpened: sandbox.spy()
      };
    });

    afterEach(function() {
      currentConversation = undefined;
      tkWorker.user.reset();
    });

    it("should tell the conversation the window has opened when " +
      "receiving a talkilla.chat-window-ready",
      function () {
        var chatAppPort = {postEvent: sinon.spy()};
        tkWorker.user.name = "bob";

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
      tkWorker.user = new UserData();
      sandbox.stub(tkWorker.user, "send");
    });

    afterEach(function() {
      tkWorker.user.reset();
    });

    it("should notify new sidebars of the logged in user",
      function() {
        tkWorker.user.name = "jb";
        tkWorker.user.connected = true;
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
        sandbox.stub(spa, "connect");
        handlers.postEvent = sinon.spy();
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.notCalled(spa.connect);
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
      tkWorker.user = new UserData();
      sandbox.stub(tkWorker.user, "send");
      sandbox.stub(spa, "presenceRequest");
    });

    afterEach(function() {
      tkWorker.user.reset();
    });

    it("should notify new sidebars of current users",
      function() {
        tkWorker.user.name = "jb";
        _presenceSocket = {send: sinon.spy()};
        tkWorker.users.reset();
        handlers.postEvent = sinon.spy();
        handlers['talkilla.presence-request']({
          topic: "talkilla.presence-request",
          data: {}
        });

        sinon.assert.calledWith(handlers.postEvent, "talkilla.users");
      });

    it("should request for the initial presence state " +
       "if there is no current users", function() {
        tkWorker.users.reset();
        handlers['talkilla.presence-request']({
          topic: "talkilla.presence-request",
          data: {}
        });

        sinon.assert.calledOnce(spa.presenceRequest);
      });

  });

  describe("talkilla.call-offer", function() {

    it("should send an offer when receiving a talkilla.call-offer event",
      function() {
        tkWorker.user.name = "tom";
        sandbox.stub(spa, "callOffer");
        var offerMsg = new payloads.Offer({
          peer: "tom",
          offer: { sdp: "sdp", type: "type" }
        });

        handlers['talkilla.call-offer']({
          topic: "talkilla.call-offer",
          data: offerMsg
        });

        sinon.assert.calledOnce(spa.callOffer);
        sinon.assert.calledWithExactly(spa.callOffer, offerMsg);
      });
  });

  describe("talkilla.call-answer", function() {
    it("should send a websocket message when receiving talkilla.call-answer",
      function() {
        tkWorker.user.name = "fred";
        sandbox.stub(spa, "callAnswer");
        var answerMsg = new payloads.Answer({
          answer: "fake answer",
          peer: "fred"
        });

        handlers['talkilla.call-answer']({
          topic: "talkilla.call-answer",
          data: answerMsg
        });

        sinon.assert.calledOnce(spa.callAnswer);
        sinon.assert.calledWithExactly(
          spa.callAnswer, answerMsg);
      });
  });

  describe("talkilla.call-hangup", function() {
    afterEach(function() {
      currentConversation = undefined;
    });

    it("should hangup the call when receiving talkilla.call-hangup",
      function() {
        var hangupMsg = new payloads.Hangup({peer: "florian"});
        tkWorker.user.name = "florian";
        sandbox.stub(spa, "callHangup");

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: hangupMsg.toJSON()
        });

        sinon.assert.calledOnce(spa.callHangup);
        sinon.assert.calledWithExactly(spa.callHangup, hangupMsg);
      });
  });

  describe("talkilla.ice-candidate", function() {
    afterEach(function() {
    });

    it("should pass the ice candidate to the spa",
      function() {
        sandbox.stub(spa, "iceCandidate");
        var iceCandidateMsg = new payloads.IceCandidate({
          peer: "lloyd",
          candidate: "dummy"
        });

        handlers['talkilla.ice-candidate']({
          topic: "talkilla.ice-candidate",
          data: iceCandidateMsg
        });

        sinon.assert.calledOnce(spa.iceCandidate);
        sinon.assert.calledWithExactly(spa.iceCandidate, iceCandidateMsg);
      });
  });

});
