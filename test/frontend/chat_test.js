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
});

