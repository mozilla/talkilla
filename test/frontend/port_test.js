/* global Backbone, describe, it, beforeEach, afterEach, sinon, chai, app */
var expect = chai.expect;

describe("app.port", function() {
  "use strict";

  var sandbox, mozSocialBackup, fakePort, postMessageSpy;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    postMessageSpy = sinon.spy();
    mozSocialBackup = navigator.mozSocial;
    fakePort = {postMessage: postMessageSpy};
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: fakePort
        };
      }
    };
    app.port._port = undefined; // reset _port singleton
  });

  afterEach(function() {
    sandbox.restore();
    navigator.mozSocial = mozSocialBackup;
  });

  it("should implement Backbone.Events interface", function() {
    expect(app.port).to.include.keys(Object.keys(Backbone.Events));
  });

  it("should be able to trigger and subscribe to events", function(done) {
    var testData = {bar: "baz"};
    app.port.on("foo", function(data) {
      expect(data).to.deep.equal(testData);
      done();
    });
    app.port.trigger("foo", testData);
  });

  it("should retrieve a configured worker port", function() {
    var port = app.port.port;
    expect(port).to.deep.equal(fakePort);
    expect(port).to.include.keys(['onmessage', 'postMessage']);
    expect(port.onmessage).to.be.a('function');
  });

  it("should trigger an event when a message is received by the port",
    function(done) {
      var port = app.port.port;
      app.port.on("universe", function(data) {
        expect(data.answer).to.equal(42);
        done();
      });
      port.onmessage({data: {topic: "universe", data: {answer: 42}}});
    });

  it("should be able to post an event", function() {
    app.port.postEvent("answer", 42);
    sinon.assert.calledOnce(postMessageSpy);
    sinon.assert.calledWithExactly(postMessageSpy, {topic: "answer", data: 42});
  });

});
