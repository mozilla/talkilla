/*global chai, sinon, browserPort:true, currentConversation:true,
  SPA, Conversation, tkWorker, _setupSPA, payloads */
"use strict";

var expect = chai.expect;

describe("SPA events", function() {
  var sandbox;

  var fakeOffer = {fakeOffer: true};
  var fakeAnswer = {fakeAnswer: true};

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker");
    tkWorker.spa = new SPA({src: "example.com"});
    _setupSPA(tkWorker.spa);

    tkWorker.users.reset();
    sandbox.stub(tkWorker.user, "send");
    sandbox.stub(tkWorker, "loadContacts");
    sandbox.stub(tkWorker.contactsDb, "add");
  });

  afterEach(function() {
    currentConversation = undefined;
    sandbox.restore();
  });

  describe("`connected` event", function() {
    var data = {
      addresses: [{type: "email", value: "foo"}],
      capabilities: ["call", "move"]
    };

    it("should set the user data as connected", function() {
      tkWorker.spa.trigger("connected", data);

      expect(tkWorker.user.connected).to.be.equal(true);
    });

    it("should broadcast a `talkilla.spa-connected` event", function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      tkWorker.spa.trigger("connected", data);

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(tkWorker.ports.broadcastEvent,
                                     "talkilla.spa-connected",
                                     {capabilities: data.capabilities});
    });

    it("should load the contacts database", function() {
      tkWorker.spa.trigger("connected", data);

      sinon.assert.calledOnce(tkWorker.loadContacts);
    });

  });

  describe("`message` event", function() {

    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
    });

    it("should create a new conversation object with the call data",
      function() {
        tkWorker.users.set('alice', {});
        var textMsg = new payloads.SPAChannelMessage({
          type: "message",
          message: "a message",
          peer: "alice"
        });

        tkWorker.spa.trigger("message", textMsg);

        expect(currentConversation).to.be.an.instanceOf(Conversation);
      });

    it("should try to re-use an existing conversation object",
      function() {
        var textMsg = new payloads.SPAChannelMessage({
          type: "message",
          message: "another message",
          peer: "alice"
        });
        currentConversation = new Conversation({
          capabilities: {},
          peer: tkWorker.spa,
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });
        sandbox.stub(currentConversation, "handleIncomingText");

        tkWorker.spa.trigger("message", textMsg);

        sinon.assert.calledOnce(currentConversation.handleIncomingText);
        sinon.assert.calledWith(currentConversation.handleIncomingText,
                                textMsg);
      });

    it("should add the contact to the database", function() {
      tkWorker.users.set('alice', {});
      var textMsg = new payloads.SPAChannelMessage({
        type: "message",
        message: "a message",
        peer: "alice"
      });

      tkWorker.spa.trigger("message", textMsg);

      sinon.assert.calledOnce(tkWorker.contactsDb.add);
      sinon.assert.calledWith(tkWorker.contactsDb.add, {
        username: "alice"
      });
    });

  });

  describe("`users` event", function() {
    beforeEach(function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");
    });

    afterEach(function() {
      tkWorker.users.reset();
    });

    it("should update the current list of users", function() {
      tkWorker.users.set("jb", {presence: "disconnected"});

      tkWorker.spa.trigger("users", [
        {nick: "james"},
        {nick: "harvey"}
      ]);

      expect(tkWorker.users.all()).to.deep.equal({
        jb: {username:"jb", presence: "disconnected"},
        james: {username:"james", presence: "connected"},
        harvey: {username:"harvey", presence: "connected"}
      });
    });

    it("should broadcast a `talkilla.users` event with the list of users",
      function() {
        tkWorker.spa.trigger("users", [{nick: "jb"}]);

        sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
        sinon.assert.calledWith(
          tkWorker.ports.broadcastEvent, "talkilla.users", [
            { username: "jb", presence: "connected" }
          ]);
      });

  });

  describe("`userJoined` event", function() {

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.users.reset();
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      tkWorker.spa.trigger("userJoined", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent, "talkilla.users", [
        {username: "foo", presence: "connected"}
      ]);
    });

    it("should broadcast a `talkilla.user-joined` event", function() {
      tkWorker.users.reset();
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      tkWorker.spa.trigger("userJoined", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent,
                              "talkilla.user-joined", "foo");
    });

  });

  describe("`userLeft` event", function() {
    beforeEach(function () {
      sandbox.stub(tkWorker.ports, "broadcastEvent");
    });

    it("should not broadcast anything if the user is not in the " +
       "current users list", function() {

      tkWorker.spa.trigger("userLeft", "foo");

      sinon.assert.notCalled(tkWorker.ports.broadcastEvent);
    });

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.users.set("foo", {presence: "connected"});

      tkWorker.spa.trigger("userLeft", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent, "talkilla.users", [
        {username: "foo", presence: "disconnected"}
      ]);
    });

    it("should broadcast a `talkilla.user-left` event", function() {
      tkWorker.users.set("foo", {presence: "connected"});

      tkWorker.spa.trigger("userLeft", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent,
                              "talkilla.user-left", "foo");
    });

  });

  describe("`offer` event", function() {
    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
    });

    afterEach(function() {
      browserPort = undefined;
      currentConversation = undefined;
    });

    it("should create a new conversation object with the call data",
      function() {
      tkWorker.users.set('alice',{});
      var offerMsg = new payloads.Offer({
        callid: 42,
        offer: fakeOffer,
        peer: "alice",
        upgrade: false
      });

      tkWorker.spa.trigger("offer", offerMsg);

      expect(currentConversation).to.be.an.instanceOf(Conversation);
    });

    it("should try to re-use an existing conversation object",
      function() {
        var offerMsg = new payloads.Offer({
          callid: 42,
          offer: fakeOffer,
          peer: "alice",
          upgrade: false
        });
        currentConversation = new Conversation({
          capabilities: {},
          peer: tkWorker.spa,
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });
        sandbox.stub(currentConversation, "handleIncomingCall");

        tkWorker.spa.trigger("offer", offerMsg);

        sinon.assert.calledOnce(currentConversation.handleIncomingCall);
        sinon.assert.calledWith(currentConversation.handleIncomingCall,
                                offerMsg);
      });

    it("should add the contact to the database", function() {
      tkWorker.users.set('alice',{});
      var offerMsg = new payloads.Offer({
        callid: 42,
        offer: fakeOffer,
        peer: "alice",
        upgrade: false
      });

      tkWorker.spa.trigger("offer", offerMsg);

      sinon.assert.calledOnce(tkWorker.contactsDb.add);
      sinon.assert.calledWith(tkWorker.contactsDb.add, {
        username: "alice"
      });

    });

  });

  describe("`answer` event", function() {

    it("should call callAccepted on the conversation", function () {
      var answerMsg = new payloads.Answer({
        answer: fakeAnswer,
        peer: "alice"
      });

      currentConversation = {
        callAccepted: sandbox.spy()
      };

      tkWorker.spa.trigger("answer", answerMsg);

      sinon.assert.calledOnce(currentConversation.callAccepted);
      sinon.assert.calledWithExactly(
        currentConversation.callAccepted, answerMsg);
    });

  });

  describe("`hangup` event", function() {
    beforeEach(function() {
      currentConversation = {
        callHangup: function() {}
      };
    });

    it("should call callHangup on the conversation", function() {
      var hangupMsg = new payloads.Hangup({callid: 42, peer: "bar"});
      sandbox.stub(currentConversation, "callHangup");

      tkWorker.spa.trigger("hangup", hangupMsg);

      sinon.assert.calledOnce(currentConversation.callHangup);
      sinon.assert.calledWithExactly(
        currentConversation.callHangup, hangupMsg);
    });
  });

  describe("`hold` event", function() {
    beforeEach(function() {
      currentConversation = {
        hold: function() {}
      };
    });

    it("should call hold on the conversation", function() {
      var holdMsg = new payloads.Hold({callid: 42, peer: "bar"});
      sandbox.stub(currentConversation, "hold");

      tkWorker.spa.trigger("hold", holdMsg);

      sinon.assert.calledOnce(currentConversation.hold);
      sinon.assert.calledWithExactly(
        currentConversation.hold, holdMsg);
    });
  });

  describe("`resume` event", function() {
    beforeEach(function() {
      currentConversation = {
        resume: function() {}
      };
    });

    it("should call resume on the conversation", function() {
      var resumeMsg = new payloads.Resume({
        callid: 42,
        peer: "bar",
        media: {video: true}
      });
      sandbox.stub(currentConversation, "resume");

      tkWorker.spa.trigger("resume", resumeMsg);

      sinon.assert.calledOnce(currentConversation.resume);
      sinon.assert.calledWithExactly(
        currentConversation.resume, resumeMsg);
    });
  });

  describe("`ice:candidate` event", function() {
    beforeEach(function() {
      currentConversation = {
        iceCandidate: function() {}
      };
    });

    it("should call callHangup on the conversation", function() {
      sandbox.stub(currentConversation, "iceCandidate");

      var iceCandidateMsg = new payloads.IceCandidate({
        peer: "lloyd",
        candidate: {fakeCandidate: true}
      });

      tkWorker.spa.trigger("ice:candidate", iceCandidateMsg);

      sinon.assert.calledOnce(currentConversation.iceCandidate);
      sinon.assert.calledWithExactly(
        currentConversation.iceCandidate, iceCandidateMsg);
    });
  });

  describe("`move-accept` event", function() {
    it("should broadcast a `talkilla.move-accept` event", function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");
      var moveAcceptMsg = new payloads.MoveAccept({
        peer: "frank",
        callid: 42
      });

      tkWorker.spa.trigger("move-accept", moveAcceptMsg);

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(tkWorker.ports.broadcastEvent,
                                     "talkilla.move-accept",
                                     moveAcceptMsg);
    });
  });

  describe("`reconnection` event", function() {
    it("should not set the user data as disconnected", function() {
      tkWorker.spa.trigger("reconnection", {timeout: 42, attempt: 1});
      expect(tkWorker.user.connected).to.be.equal(true);
    });

    it("should broadcast a `talkilla.server-reconnection` event", function() {
      tkWorker.user.name = "harvey";
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      tkWorker.spa.trigger("reconnection", {timeout: 42, attempt: 1});

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        tkWorker.ports.broadcastEvent, "talkilla.server-reconnection",
        {timeout:42, attempt: 1}
      );
    });

    it("should not close the current worker session", function() {
      sandbox.stub(tkWorker, "closeSession");

      tkWorker.spa.trigger("reconnection", {code: 1006});
      sinon.assert.notCalled(tkWorker.closeSession);
    });
  });

  describe("`reauth-needed event", function() {

    it("should foward the event to all ports", function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      tkWorker.spa.trigger("reauth-needed");

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        tkWorker.ports.broadcastEvent, "talkilla.reauth-needed");
    });

    it("should close the current worker session", function() {
      sandbox.stub(tkWorker, "closeSession");

      tkWorker.spa.trigger("reauth-needed", {code: 1006});

      sinon.assert.calledOnce(tkWorker.closeSession);
    });
  });

  describe("`instantshare` event", function() {

    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
      tkWorker.users.set('alice',{});
    });

    afterEach(function() {
      browserPort = undefined;
      currentConversation = undefined;
    });

    it("should create a new conversation object", function() {
      var instantShareMsg = new payloads.InstantShare({
        peer: "alice"
      });

      tkWorker.spa.trigger("instantshare", instantShareMsg);

      expect(currentConversation).to.be.an.instanceOf(Conversation);
    });

    it("should try to re-use an existing conversation object",
      function() {
        var instantShareMsg = new payloads.InstantShare({
          peer: "alice"
        });
        currentConversation = new Conversation({
          capabilities: {},
          peer: tkWorker.users.get("alice"),
          browserPort: browserPort,
          users: tkWorker.users,
          user: tkWorker.user
        });
        sandbox.stub(currentConversation, "startCall");

        tkWorker.spa.trigger("instantshare", instantShareMsg);

        sinon.assert.calledOnce(currentConversation.startCall);
      });

    it("should add the contact to the database", function() {
      var instantShareMsg = new payloads.InstantShare({
        peer: "alice"
      });

      tkWorker.spa.trigger("instantshare", instantShareMsg);

      sinon.assert.calledOnce(tkWorker.contactsDb.add);
      sinon.assert.calledWith(tkWorker.contactsDb.add, {
        username: "alice"
      });
    });

  });

});
