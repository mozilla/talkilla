/*global chai, sinon, browserPort:true, currentConversation:true,
  SPA, Conversation, ports, tkWorker,
  _setupSPA, _currentUserData:true, UserData */

/* Needed due to the use of non-camelcase in the websocket topics */
/* jshint camelcase:false */
var expect = chai.expect;

describe("SPA events", function() {
  var sandbox, spa;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(window, "Worker");
    spa = new SPA({src: "example.com"});
    _setupSPA(spa);

    tkWorker.currentUsers.reset();
    _currentUserData = new UserData();
    sandbox.stub(_currentUserData, "send");
    sandbox.stub(tkWorker, "loadContacts");
  });

  afterEach(function() {
    currentConversation = undefined;
    sandbox.restore();
  });

  describe("`connected` event", function() {
    it("should set the user data as connected", function() {
      spa.trigger("connected");

      expect(_currentUserData.connected).to.be.equal(true);
    });

    it("should broadcast a `talkilla.login-success` event", function() {
      _currentUserData.userName = "harvey";
      sandbox.stub(ports, "broadcastEvent");

      spa.trigger("connected");

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.login-success", {username: "harvey"}
      );
    });

    it("should load the contacts database", function() {
      spa.trigger("connected");

      sinon.assert.calledOnce(tkWorker.loadContacts);
    });

  });

  describe("`message:users` event", function() {
    beforeEach(function() {
      sandbox.stub(ports, "broadcastEvent");
    });

    afterEach(function() {
      tkWorker.currentUsers.reset();
    });

    it("should update the current list of users", function() {
      tkWorker.currentUsers.set("jb", {presence: "disconnected"});

      spa.trigger("message:users", [
        {nick: "james"},
        {nick: "harvey"}
      ]);

      expect(tkWorker.currentUsers.all()).to.deep.equal({
        jb: {presence: "disconnected"},
        james: {presence: "connected"},
        harvey: {presence: "connected"}
      });
    });

    it("should broadcast a `talkilla.users` event with the list of users",
      function() {
        spa.trigger("message:users", [{nick: "jb"}]);

        sinon.assert.calledOnce(ports.broadcastEvent);
        sinon.assert.calledWith(
          ports.broadcastEvent, "talkilla.users", [
            { nick: "jb", presence: "connected" }
          ]);
      });

  });

  describe("`message:userJoined` event", function() {

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.currentUsers.reset();
      sandbox.stub(ports, "broadcastEvent");

      spa.trigger("message:userJoined", "foo");

      sinon.assert.called(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "connected"}
      ]);
    });

    it("should broadcast a `talkilla.user-joined` event", function() {
      tkWorker.currentUsers.reset();
      sandbox.stub(ports, "broadcastEvent");

      spa.trigger("message:userJoined", "foo");

      sinon.assert.called(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent,
                              "talkilla.user-joined", "foo");
    });

  });

  describe("`message:userLeft` event", function() {
    beforeEach(function () {
      sandbox.stub(ports, "broadcastEvent");
    });

    it("should not broadcast anything if the user is not in the " +
       "current users list", function() {

      spa.trigger("message:userLeft", "foo");

      sinon.assert.notCalled(ports.broadcastEvent);
    });

    it("should broadcast a `talkilla.users` event", function() {
      tkWorker.currentUsers.set("foo", {presence: "connected"});

      spa.trigger("message:userLeft", "foo");

      sinon.assert.called(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "disconnected"}
      ]);
    });

    it("should broadcast a `talkilla.user-left` event", function() {
      tkWorker.currentUsers.set("foo", {presence: "connected"});

      spa.trigger("message:userLeft", "foo");

      sinon.assert.called(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent,
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
      var offer = {type: "fake", sdp: "sdp" };
      var from = "alice";

      spa.trigger("offer", offer, from);

      expect(currentConversation).to.be.an.instanceOf(Conversation);
    });

    it("should try to re-use an existing conversation object",
      function() {
        currentConversation = new Conversation({peer: "florian"});
        sandbox.stub(currentConversation, "handleIncomingCall");

        var offer = {type: "fake", sdp: "sdp" };
        var from = "alice";
        var data = {offer: offer, peer: from};
        spa.trigger("offer", offer, from);

        sinon.assert.calledOnce(currentConversation.handleIncomingCall);
        sinon.assert.calledWith(currentConversation.handleIncomingCall,
                                data);
      });
  });

  describe("`answer` event", function() {

    it("should call callAccepted on the conversation", function () {
      var from = "alice";
      var answer = {type: "fake", sdp: "sdp"};
      var data = {peer: from, answer: answer};

      currentConversation = {
        callAccepted: sandbox.spy()
      };

      spa.trigger("answer", answer, from);

      sinon.assert.calledOnce(currentConversation.callAccepted);
      sinon.assert.calledWithExactly(
        currentConversation.callAccepted, data);
    });

  });

  describe("`hangup` event", function() {
    beforeEach(function() {
      currentConversation = {
        callHangup: function() {}
      };
    });

    it("should call callHangup on the conversation", function() {
      sandbox.stub(currentConversation, "callHangup");

      spa.trigger("hangup", "bob");

      sinon.assert.calledOnce(currentConversation.callHangup);
      sinon.assert.calledWithExactly(
        currentConversation.callHangup, {peer: "bob"});
    });
  });

  describe("`disconnected` event", function() {
    it("should set the user data as disconnected", function() {
      spa.trigger("disconnected", {code: 1006});

      expect(_currentUserData.connected).to.be.equal(false);
    });

    it("should broadcast a `talkilla.presence-unavailable` event", function() {
      _currentUserData.userName = "harvey";
      sandbox.stub(ports, "broadcastEvent");

      spa.trigger("disconnected", {code: 1006});

      sinon.assert.calledTwice(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.presence-unavailable", 1006
      );
    });

    it("should broadcast a `talkilla.logout-success` event", function() {
      _currentUserData.userName = "harvey";
      sandbox.stub(ports, "broadcastEvent");

      spa.trigger("disconnected", {code: 1006});

      sinon.assert.calledTwice(ports.broadcastEvent);
      sinon.assert.calledWithExactly(
        ports.broadcastEvent, "talkilla.logout-success", {}
      );
    });

    it("should close the contacts database", function() {
      sandbox.stub(tkWorker.contactsDb, "close");

      spa.trigger("disconnected", {code: 1000});

      sinon.assert.calledOnce(tkWorker.contactsDb.close);
    });
  });

});
