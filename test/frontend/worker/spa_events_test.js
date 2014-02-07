/*global chai, sinon, browserPort:true,
  SPA, tkWorker, _setupSPA, payloads */
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
    var textMsg;

    beforeEach(function() {
      browserPort = {postEvent: sandbox.spy()};
      textMsg = new payloads.SPAChannelMessage({
        type: "message",
        message: "a message",
        peer: "alice"
      });
      sandbox.stub(tkWorker, "collectContact");
    });

    it("should pass the message to conversationList.message",
      function() {
        sandbox.stub(tkWorker.conversationList, "message");

        tkWorker.spa.trigger("message", textMsg);

        sinon.assert.calledOnce(tkWorker.conversationList.message);
        sinon.assert.calledWithExactly(tkWorker.conversationList.message,
          textMsg, [], browserPort);
      });

    it("should add the contact to the database", function() {
      tkWorker.users.set('alice', {});

      tkWorker.spa.trigger("message", textMsg);

      sinon.assert.calledOnce(tkWorker.collectContact);
      sinon.assert.calledWith(tkWorker.collectContact, "alice");
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
      tkWorker.users.set("jb", {presence: "disconnected"}, "email");

      tkWorker.spa.trigger("users", [
        {nick: "james"},
        {nick: "harvey"}
      ]);

      expect(tkWorker.users.all()).to.deep.equal({
        jb: {email: "jb", username: "jb", presence: "disconnected"},
        james: {email: "james", username: "james", presence: "connected"},
        harvey: {email: "harvey", username: "harvey", presence: "connected"}
      });
    });

    it("should broadcast a `talkilla.users` event with the list of users",
      function() {
        tkWorker.spa.trigger("users", [{nick: "jb"}]);

        sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
        sinon.assert.calledWith(
          tkWorker.ports.broadcastEvent, "talkilla.users", [
            { email: "jb", username: "jb", presence: "connected" }
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
        {email: "foo", username: "foo", presence: "connected"}
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
      tkWorker.users.set("foo", {presence: "connected"}, "email");

      tkWorker.spa.trigger("userLeft", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent, "talkilla.users", [
        {email: "foo", username: "foo", presence: "disconnected"}
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
      sandbox.stub(tkWorker, "collectContact");
    });

    afterEach(function() {
      browserPort = undefined;
      tkWorker.conversationList.reset();
    });

    it("should pass the offer to conversationList.offer",
      function() {
      sandbox.stub(tkWorker.conversationList, "offer");
      var offerMsg = new payloads.Offer({
        callid: 42,
        offer: fakeOffer,
        peer: "alice",
        upgrade: false
      });

      tkWorker.spa.trigger("offer", offerMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.offer);
      sinon.assert.calledWithExactly(tkWorker.conversationList.offer,
        offerMsg, [], browserPort);
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

      sinon.assert.calledOnce(tkWorker.collectContact);
      sinon.assert.calledWith(tkWorker.collectContact, "alice");
    });
  });

  describe("`answer` event", function() {
    it("should pass answerMsg to conversationList", function () {
      sandbox.stub(tkWorker.conversationList, "answer");
      var answerMsg = new payloads.Answer({
        answer: fakeAnswer,
        peer: "alice"
      });

      tkWorker.spa.trigger("answer", answerMsg);

      sinon.assert.calledOnce(
        tkWorker.conversationList.answer);
      sinon.assert.calledWithExactly(tkWorker.conversationList.answer,
        answerMsg);
    });

  });

  describe("`hangup` event", function() {
    it("should pass hangupMsg to conversationList", function() {
      var hangupMsg = new payloads.Hangup({callid: 42, peer: "bar"});
      sandbox.stub(tkWorker.conversationList, "hangup");

      tkWorker.spa.trigger("hangup", hangupMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.hangup);
      sinon.assert.calledWithExactly(tkWorker.conversationList.hangup,
        hangupMsg);
    });
  });

  describe("`hold` event", function() {
    it("should pass holdMsg to conversationList", function() {
      sandbox.stub(tkWorker.conversationList, "hold");
      var holdMsg = new payloads.Hold({callid: 42, peer: "bar"});

      tkWorker.spa.trigger("hold", holdMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.hold);
      sinon.assert.calledWithExactly(tkWorker.conversationList.hold, holdMsg);
    });
  });

  describe("`resume` event", function() {
    it("should pass resume to the conversationList", function() {
      var resumeMsg = new payloads.Resume({
        callid: 42,
        peer: "bar",
        media: {video: true}
      });
      sandbox.stub(tkWorker.conversationList, "resume");

      tkWorker.spa.trigger("resume", resumeMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.resume);
      sinon.assert.calledWithExactly(tkWorker.conversationList.resume,
        resumeMsg);
    });
  });

  describe("`ice:candidate` event", function() {
    it("should call callHangup on the conversation", function() {
      sandbox.stub(tkWorker.conversationList, "iceCandidate");
      var iceCandidateMsg = new payloads.IceCandidate({
        peer: "bar",
        candidate: {fakeCandidate: true}
      });

      tkWorker.spa.trigger("ice:candidate", iceCandidateMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.iceCandidate);
      sinon.assert.calledWithExactly(tkWorker.conversationList.iceCandidate,
        iceCandidateMsg);
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
    });

    it("should pass instantshare message to conversationList", function() {
      sandbox.stub(tkWorker.conversationList, "instantshare");
      var instantShareMsg = new payloads.InstantShare({
        peer: "alice"
      });

      tkWorker.spa.trigger("instantshare", instantShareMsg);

      sinon.assert.calledOnce(tkWorker.conversationList.instantshare);
      sinon.assert.calledWithExactly(tkWorker.conversationList.instantshare,
        instantShareMsg, [], browserPort);
    });
  });

});
