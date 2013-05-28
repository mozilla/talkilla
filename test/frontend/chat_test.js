/* global app, chai, describe, it */
/* jshint expr:true */
var expect = chai.expect;

describe("ChatApp", function() {
  var sandbox, chatApp;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.port, "postEvent");
    chatApp = new ChatApp;
  });

  afterEach(function() {
    app.port.off();
    sandbox.restore();
  });

  it("should have a call model" , function() {
    expect(chatApp.call).to.be.an.instanceOf(app.models.Call);
  });

  it("should ping back the worker when ready", function() {
    sinon.assert.calledOnce(app.port.postEvent);
    sinon.assert.calledWithExactly(app.port.postEvent, "talkilla.chat-window-ready", {});
  });

  it("should set the caller and callee and start the call when receiving a talkilla.call-start event", function() {
    var caller = "alice";
    var callee = "bob";
    sandbox.stub(chatApp.call, "set");
    sandbox.stub(chatApp.call, "start");

    app.port.trigger('talkilla.call-start', caller, callee);
    sinon.assert.calledOnce(chatApp.call.set);
    sinon.assert.calledWithExactly(chatApp.call.set, {caller: "alice", callee: "bob"});

    sinon.assert.calledOnce(chatApp.call.start);
    sinon.assert.calledWithExactly(chatApp.call.start);
  });

  it("should set the caller and callee and set the call as incoming when receiving a talkilla.call-incoming event", function() {
    var caller = "alice";
    var callee = "bob";
    var offer = {};
    sandbox.stub(chatApp.call, "set");
    sandbox.stub(chatApp.call, "incoming");

    app.port.trigger('talkilla.call-incoming', caller, callee, offer);
    sinon.assert.calledOnce(chatApp.call.set);
    sinon.assert.calledWithExactly(chatApp.call.set, {caller: "alice", callee: "bob"});

    sinon.assert.calledOnce(chatApp.call.incoming);
    sinon.assert.calledWithExactly(chatApp.call.incoming);
  });
});

describe("Call", function() {

  var call;

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

