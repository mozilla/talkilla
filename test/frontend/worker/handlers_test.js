/*global chai, sinon, Port, handlers, currentConversation:true, UserData,
  browserPort:true, tkWorker, Conversation, SPA, payloads */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe('handlers', function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "SPAPort");
    sandbox.stub(window, "Server");
    sandbox.stub(window, "Worker").returns({postMessage: sinon.spy()});
    tkWorker.spa = new SPA({src: "example.com"});
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function() {
    sandbox.restore();
    browserPort = undefined;
  });

  describe("social.initialize", function() {
    beforeEach(function() {
      sandbox.stub(tkWorker, "initialize");
      sandbox.stub(tkWorker.ports, "remove");
    });

    it("should save the browser port", function() {
      browserPort = undefined;

      handlers['social.initialize']();

      expect(browserPort).to.equal(handlers);
    });

    it("should remove the port from the list of ports", function() {
      handlers['social.initialize']();

      sinon.assert.calledOnce(tkWorker.ports.remove);
      sinon.assert.calledWithExactly(tkWorker.ports.remove, handlers);
    });

    it("should initialize the worker", function() {
      handlers['social.initialize']();

      sinon.assert.calledOnce(tkWorker.initialize);
    });
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
        currentConversation = new Conversation({
          capabilities: tkWorker.spa.capabilities,
          peer: tkWorker.spa,
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });
        currentConversation.port = port;

        handlers['social.port-closing'].bind(port)();
        expect(currentConversation).to.be.equal(undefined);
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

  describe("talkilla.conversation-open", function() {
    afterEach(function() {
      currentConversation = undefined;
    });

    it("should create a new conversation object when receiving a " +
       "talkilla.conversation-open event", function() {
        var offerMsg = new payloads.Offer({
          offer: "fake offer",
          peer: "alice"
        });
        tkWorker.users.set("alice", {});
        handlers.postEvent = sinon.spy();
        handlers['talkilla.conversation-open']({
          topic: "talkilla.conversation-open",
          data: offerMsg
        });

        expect(currentConversation).to.be.an.instanceOf(Conversation);
      });

    it("should store the contact", function() {
      sandbox.stub(tkWorker.contactsDb, "add");
      var offerMsg = new payloads.Offer({
        offer: "fake offer",
        peer: "alice"
      });
      tkWorker.users.set("alice", {});
      handlers.postEvent = sinon.spy();
      handlers['talkilla.conversation-open']({
        topic: "talkilla.conversation-open",
        data: offerMsg
      });

      sinon.assert.calledOnce(tkWorker.contactsDb.add);
      sinon.assert.calledWith(tkWorker.contactsDb.add, {username: "alice"});
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
      handlers.postEvent = sinon.spy();
      sandbox.stub(tkWorker.user, "send");
    });

    afterEach(function() {
      tkWorker.initialized = false;
      tkWorker.user.reset();
    });

    it("should notify the sidebar the worker is ready", function() {
      tkWorker.initialized = true;
      handlers['talkilla.sidebar-ready']({
        topic: "talkilla.sidebar-ready",
        data: {}
      });

      sinon.assert.calledOnce(handlers.postEvent);
      sinon.assert.calledWithExactly(handlers.postEvent,
        "talkilla.worker-ready"
      );
    });

    it("should not notify the sidebar if the worker is not initialized",
      function(){
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.notCalled(handlers.postEvent);
      });

    describe("spa connected", function() {
      beforeEach(function() {
        tkWorker.initialized = true;
        tkWorker.spa.connected = true;
      });

      it("should send the current logged in user's details", function() {
        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.calledOnce(tkWorker.user.send);
      });

      it("should notify the spa is connected", function() {
        tkWorker.spa.capabilities = ["call"];

        handlers['talkilla.sidebar-ready']({
          topic: "talkilla.sidebar-ready",
          data: {}
        });

        sinon.assert.called(handlers.postEvent);
        sinon.assert.calledWithExactly(handlers.postEvent,
          "talkilla.spa-connected",
          {capabilities: tkWorker.spa.capabilities}
        );
      });

      it("should notify the sidebar of the list of current users",
        function() {
          var fakeUsersList = [1, 2, 3];
          sandbox.stub(tkWorker.users, "toArray").returns(fakeUsersList);

          handlers['talkilla.sidebar-ready']({
            topic: "talkilla.sidebar-ready",
            data: {}
          });

          sinon.assert.called(handlers.postEvent);
          sinon.assert.calledWithExactly(
            handlers.postEvent, "talkilla.users", fakeUsersList
          );
        });
    });

  });

  describe("talkilla.spa-enable", function() {

    var spa, spaSpec;

    beforeEach(function() {
      spa = {connect: sinon.spy(), on: function() {}};
      spaSpec = {
        src: "/path/to/spa",
        name: "spa",
        credentials: "fake credentials"
      };
      sandbox.stub(window, "SPA").returns(spa);
    });

    it("should store the SPA in the database", function() {
      sandbox.stub(tkWorker.spaDb, "store");

      handlers["talkilla.spa-enable"]({
        data: spaSpec
      });

      sinon.assert.calledOnce(tkWorker.spaDb.store);
      sinon.assert.calledWith(tkWorker.spaDb.store,
                              new payloads.SPASpec(spaSpec));
    });

    it("should instantiate a new SPA with the given src", function() {
      sandbox.stub(tkWorker.spaDb, "store", function(spec, callback) {
        callback(null, spec);

        sinon.assert.calledOnce(SPA);
        sinon.assert.calledWithExactly(SPA, {src: "/path/to/spa"});
      });

      handlers["talkilla.spa-enable"]({
        data: {src: "/path/to/spa", credentials: "fake credentials"}
      });
    });

    it("should connect the created SPA with given credentials", function() {
      sandbox.stub(tkWorker.spaDb, "store", function(spec, callback) {
        callback(null, spec);

        sinon.assert.calledOnce(spa.connect);
        sinon.assert.calledWithExactly(spa.connect, "fake credentials");
      });

      handlers["talkilla.spa-enable"]({
        data: {src: "/path/to/spa", credentials: "fake credentials"}
      });
    });

  });

  describe("talkilla.initiate-move", function() {
    it("should notify the SPA a call moving is initiated", function() {
      sandbox.stub(tkWorker.spa, "initiateMove");
      var moveMsg = new payloads.Move({peer: "chuck", callid: 42});

      handlers["talkilla.initiate-move"]({data: moveMsg});

      sinon.assert.calledOnce(tkWorker.spa.initiateMove);
      sinon.assert.calledWithExactly(tkWorker.spa.initiateMove, moveMsg);
    });
  });

  describe("talkilla.spa-channel-message", function() {

    it("should forward the message to the SPA", function() {
      var data = {message: "yet another message", peer: "lola"};
      var textMsg = new payloads.SPAChannelMessage(data);
      sandbox.stub(tkWorker.spa, "sendMessage");

      handlers["talkilla.spa-channel-message"]({data: data});

      sinon.assert.calledOnce(tkWorker.spa.sendMessage);
      sinon.assert.calledWithExactly(tkWorker.spa.sendMessage, textMsg);
    });

  });

  describe("talkilla.call-offer", function() {

    it("should send an offer when receiving a talkilla.call-offer event",
      function() {
        tkWorker.user.name = "tom";
        sandbox.stub(tkWorker.spa, "callOffer");
        var offerMsg = new payloads.Offer({
          peer: "tom",
          offer: { sdp: "sdp", type: "type" }
        });

        handlers['talkilla.call-offer']({
          topic: "talkilla.call-offer",
          data: offerMsg
        });

        sinon.assert.calledOnce(tkWorker.spa.callOffer);
        sinon.assert.calledWithExactly(tkWorker.spa.callOffer, offerMsg);
      });
  });

  describe("talkilla.call-answer", function() {
    it("should send a websocket message when receiving talkilla.call-answer",
      function() {
        tkWorker.user.name = "fred";
        sandbox.stub(tkWorker.spa, "callAnswer");
        var answerMsg = new payloads.Answer({
          answer: "fake answer",
          peer: "fred"
        });

        handlers['talkilla.call-answer']({
          topic: "talkilla.call-answer",
          data: answerMsg
        });

        sinon.assert.calledOnce(tkWorker.spa.callAnswer);
        sinon.assert.calledWithExactly(
          tkWorker.spa.callAnswer, answerMsg);
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
        sandbox.stub(tkWorker.spa, "callHangup");

        handlers['talkilla.call-hangup']({
          topic: "talkilla.call-hangup",
          data: hangupMsg.toJSON()
        });

        sinon.assert.calledOnce(tkWorker.spa.callHangup);
        sinon.assert.calledWithExactly(tkWorker.spa.callHangup, hangupMsg);
      });
  });

  describe("talkilla.ice-candidate", function() {
    afterEach(function() {
    });

    it("should pass the ice candidate to the spa",
      function() {
        sandbox.stub(tkWorker.spa, "iceCandidate");
        var iceCandidateMsg = new payloads.IceCandidate({
          peer: "lloyd",
          candidate: "dummy"
        });

        handlers['talkilla.ice-candidate']({
          topic: "talkilla.ice-candidate",
          data: iceCandidateMsg
        });

        sinon.assert.calledOnce(tkWorker.spa.iceCandidate);
        sinon.assert.calledWithExactly(
          tkWorker.spa.iceCandidate, iceCandidateMsg);
      });
  });

  describe("talkilla.spa-forget-credentials", function() {

    it("should make the spa forget credentials", function() {
      sandbox.stub(tkWorker.spa, "forgetCredentials");
      handlers['talkilla.spa-forget-credentials']({
        topic: "talkilla.spa-forget-credentials",
        data: "TalkillaSPA" // XXX: part of the interface but not used
                            // for now.
      });

      sinon.assert.calledOnce(tkWorker.spa.forgetCredentials);
    });

  });

  describe("talkilla.spa-disable", function() {

    it("should drop the SPA database", function() {
      sandbox.stub(tkWorker.spaDb, "drop");
      handlers['talkilla.spa-disable']({
        topic: "talkilla.spa-disable",
        data: "TalkillaSPA" // XXX: part of the interface but not used
                            // for now.
      });

      sinon.assert.calledOnce(tkWorker.spaDb.drop);
    });

  });

});
