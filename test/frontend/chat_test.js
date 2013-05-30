/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp */
/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.port, "postEvent");
    chatApp = new ChatApp();
  });

  afterEach(function() {
    app.port.off();
    sandbox.restore();
  });

  it("should have a call model" , function() {
    expect(chatApp.call).to.be.an.instanceOf(app.models.Call);
  });

  it("should post talkilla.chat-window-ready to the worker during construction",
    function() {
      sinon.assert.calledOnce(app.port.postEvent);
      sinon.assert.calledWithExactly(app.port.postEvent,
        "talkilla.chat-window-ready", {});
    });

  it("should attach _onCallStart to talkilla.call-start", function() {
    var caller = "alice";
    var callee = "bob";
    sandbox.stub(ChatApp.prototype, "_onCallStart");
    chatApp = new ChatApp(); // We need the constructor to use the stub

    chatApp.port.trigger("talkilla.call-start", caller, callee);

    sinon.assert.calledOnce(chatApp._onCallStart);
    sinon.assert.calledWithExactly(chatApp._onCallStart, caller, callee);
  });

  describe("#_onCallStart", function() {

    it("should set the caller and callee", function() {
      var caller = "alice";
      var callee = "bob";

      chatApp._onCallStart(caller, callee);

      expect(chatApp.call.get('caller')).to.equal(caller);
      expect(chatApp.call.get('callee')).to.equal(callee);
    });

    it("should start the call", function() {
      var caller = "alice";
      var callee = "bob";
      sandbox.stub(chatApp.call, "start");

      chatApp._onCallStart(caller, callee);

      sinon.assert.calledOnce(chatApp.call.start);
      sinon.assert.calledWithExactly(chatApp.call.start);
    });
  });

  it("should set the caller + callee and set the call as " +
    "incoming when receiving a talkilla.call-incoming event", function() {
    var caller = "alice";
    var callee = "bob";
    var offer = {};
    sandbox.stub(chatApp.call, "set");
    sandbox.stub(chatApp.call, "incoming");

    app.port.trigger('talkilla.call-incoming', caller, callee, offer);
    sinon.assert.calledOnce(chatApp.call.set);
    sinon.assert.calledWithExactly(chatApp.call.set,
      {caller: "alice", callee: "bob"});

    sinon.assert.calledOnce(chatApp.call.incoming);
    sinon.assert.calledWithExactly(chatApp.call.incoming);
  });
});

describe("Call", function() {

  var sandbox, call;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    call = new app.models.Call();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should have a state machine", function() {
    expect(call.state).to.be.an.instanceOf(Object);
  });

  it("it should have an initial state", function() {
    expect(call.state.current).to.equal('ready');
  });

  describe("#start", function() {

    it("should change the state from ready to pending", function() {
      call.start();
      expect(call.state.current).to.equal('pending');
    });

    it("should raise an error if called twice", function() {
      call.start();
      expect(call.start).to.Throw();
    });
  });

  describe("#incoming", function() {

    it("should change the state from ready to pending", function() {
      call.incoming();
      expect(call.state.current).to.equal('pending');
    });

  });

  describe("#accept", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.accept();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#establish", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.establish();
      expect(call.state.current).to.equal('ongoing');
    });

  });

});

describe('Text chat', function() {
  "use strict";

  describe("app.models.TextChatEntry", function() {
    it("should be initialized with defaults", function() {
      var entry = new app.models.TextChatEntry();
      expect(entry.get("nick")).to.be.a("undefined");
      expect(entry.get("message")).to.be.a("undefined");
      expect(entry.get("date")).to.be.a("number");
    });
  });

  describe("app.models.TextChat", function() {
    it("should be empty by default", function() {
      var textChat = new app.models.TextChat();
      expect(textChat).to.have.length.of(0);
      textChat.add({nick: "jb", message: "hi"});
      expect(textChat).to.have.length.of(1);
    });

    it("should listen to data channels events and update accordingly");
  });

  describe('app.views.TextChatView', function() {
    var chatApp, sandbox;

    beforeEach(function() {
      $('body').append('<div id="textchat"><dl></dl></div>');
      sandbox = sinon.sandbox.create();
      sandbox.stub(app.port, "postEvent");
      chatApp = new ChatApp();
    });

    afterEach(function() {
      $('#textchat').remove();
      app.port.off();
      sandbox.restore();
    });

    it("should be empty by default", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat()
      });
      expect(view.collection).to.have.length.of(0);
      view.render();
      expect(view.$('dl').html()).to.equal('');
    });

    it("should update rendering when its collection is updated", function() {
      var view = new app.views.TextChatView({
        collection: new app.models.TextChat([
          {nick: "niko", message: "plop"},
          {nick: "jb", message: "hello"}
        ])
      });
      expect(view.collection).to.have.length.of(2);
      view.render();
      expect(view.$('dl dt')).to.have.length.of(2);
      // add a new message to the conversation
      view.collection.add({nick: "niko", message: "how is it going?"});
      expect(view.collection).to.have.length.of(3);
      expect(view.$('dl dt')).to.have.length.of(3);
    });
  });

});
