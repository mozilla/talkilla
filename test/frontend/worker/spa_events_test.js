/*global chai, sinon, browserPort:true, currentConversation:true,
  SPA, Conversation, tkWorker, _setupSPA, payloads */
"use strict";

var expect = chai.expect;

describe("SPA events", function() {
  var sandbox, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker");
    spa = new SPA({src: "example.com"});
    _setupSPA(spa);

    tkWorker.users.reset();
    sandbox.stub(tkWorker.user, "send");
    sandbox.stub(tkWorker, "loadContacts");
  });

  afterEach(function() {
    currentConversation = undefined;
    sandbox.restore();
  });

  describe("`connected` event", function() {
    var data = {addresses: [{type: "email", value: "foo"}]};

    it("should set the user data as connected", function() {
      spa.trigger("connected", data);

      expect(tkWorker.user.connected).to.be.equal(true);
    });

    it("should broadcast a `talkilla.spa-connected` event", function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      spa.trigger("connected", data);

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(tkWorker.ports.broadcastEvent,
                                     "talkilla.spa-connected");
    });

    it("should load the contacts database", function() {
      spa.trigger("connected", data);

      sinon.assert.calledOnce(tkWorker.loadContacts);
    });

  });

  describe("`message:users` event", function() {
    beforeEach(function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");
    });

    afterEach(function() {
      tkWorker.users.reset();
    });

    it("should update the current list of users", function() {
      tkWorker.users.set("jb", {presence: "disconnected"});

      spa.trigger("message:users", [
        {nick: "james"},
        {nick: "harvey"}
      ]);

      expect(tkWorker.users.all()).to.deep.equal({
        jb: {presence: "disconnected"},
        james: {presence: "connected"},
        harvey: {presence: "connected"}
      });
    });

    it("should broadcast a `talkilla.users` event with the list of users",
      function() {
        spa.trigger("message:users", [{nick: "jb"}]);

        sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
        sinon.assert.calledWith(
          tkWorker.ports.broadcastEvent, "talkilla.users", [
            { nick: "jb", presence: "connected" }
          ]);
      });

  });

  describe("`message:userJoined` event", function() {

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.users.reset();
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      spa.trigger("message:userJoined", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "connected"}
      ]);
    });

    it("should broadcast a `talkilla.user-joined` event", function() {
      tkWorker.users.reset();
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      spa.trigger("message:userJoined", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent,
                              "talkilla.user-joined", "foo");
    });

  });

  describe("`message:userLeft` event", function() {
    beforeEach(function () {
      sandbox.stub(tkWorker.ports, "broadcastEvent");
    });

    it("should not broadcast anything if the user is not in the " +
       "current users list", function() {

      spa.trigger("message:userLeft", "foo");

      sinon.assert.notCalled(tkWorker.ports.broadcastEvent);
    });

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.users.set("foo", {presence: "connected"});

      spa.trigger("message:userLeft", "foo");

      sinon.assert.called(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWith(tkWorker.ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "disconnected"}
      ]);
    });

    it("should broadcast a `talkilla.user-left` event", function() {
      tkWorker.users.set("foo", {presence: "connected"});

      spa.trigger("message:userLeft", "foo");

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
      var offerMsg = new payloads.Offer({offer: "fake offer", peer: "alice"});

      spa.trigger("offer", offerMsg);

      expect(currentConversation).to.be.an.instanceOf(Conversation);
    });

    it("should try to re-use an existing conversation object",
      function() {
        var offerMsg = new payloads.Offer({
          offer: "fake offer",
          peer: "alice"
        });
        currentConversation = new Conversation({peer: "florian"}, spa);
        sandbox.stub(currentConversation, "handleIncomingCall");

        spa.trigger("offer", offerMsg);

        sinon.assert.calledOnce(currentConversation.handleIncomingCall);
        sinon.assert.calledWith(currentConversation.handleIncomingCall,
                                offerMsg);
      });
  });

  describe("`answer` event", function() {

    it("should call callAccepted on the conversation", function () {
      var answerMsg = new payloads.Answer({
        answer: "fake answer",
        peer: "alice"
      });

      currentConversation = {
        callAccepted: sandbox.spy()
      };

      spa.trigger("answer", answerMsg);

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
      var hangupMsg = new payloads.Hangup({peer: "bar"});
      sandbox.stub(currentConversation, "callHangup");

      spa.trigger("hangup", hangupMsg);

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
      var holdMsg = new payloads.Hold({peer: "bar"});
      sandbox.stub(currentConversation, "hold");

      spa.trigger("hold", holdMsg);

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
      var resumeMsg = new payloads.Resume({peer: "bar", media: {video: true}});
      sandbox.stub(currentConversation, "resume");

      spa.trigger("resume", resumeMsg);

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
        candidate: "dummy"
      });

      spa.trigger("ice:candidate", iceCandidateMsg);

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

      spa.trigger("move-accept", moveAcceptMsg);

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(tkWorker.ports.broadcastEvent,
                                     "talkilla.move-accept",
                                     moveAcceptMsg.toJSON());
    });
  });

  describe("`network-error` event", function() {
    it("should set the user data as disconnected", function() {
      spa.trigger("network-error", {code: 1006});

      expect(tkWorker.user.connected).to.be.equal(false);
    });

    it("should broadcast a `talkilla.presence-unavailable` event", function() {
      tkWorker.user.name = "harvey";
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      spa.trigger("network-error", {code: 1006});

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        tkWorker.ports.broadcastEvent, "talkilla.presence-unavailable", 1006
      );
    });

    it("should close the current worker session", function() {
      sandbox.stub(tkWorker, "closeSession");

      spa.trigger("network-error", {code: 1006});

      sinon.assert.calledOnce(tkWorker.closeSession);
    });
  });

  describe("`reauth-needed event", function() {

    it("should foward the event to all ports", function() {
      sandbox.stub(tkWorker.ports, "broadcastEvent");

      spa.trigger("reauth-needed");

      sinon.assert.calledOnce(tkWorker.ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        tkWorker.ports.broadcastEvent, "talkilla.reauth-needed");
    });

    it("should close the current worker session", function() {
      sandbox.stub(tkWorker, "closeSession");

      spa.trigger("reauth-needed", {code: 1006});

      sinon.assert.calledOnce(tkWorker.closeSession);
    });
  });

});
