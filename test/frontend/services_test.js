/* global Backbone, describe, it, beforeEach, afterEach, sinon, chai, app */
var expect = chai.expect;

describe("app.services", function() {
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
    app.services._port = undefined; // reset _port singleton
  });

  afterEach(function() {
    sandbox.restore();
    navigator.mozSocial = mozSocialBackup;
  });

  it("should implement Backbone.Events interface", function() {
    expect(app.services).to.include.keys(Object.keys(Backbone.Events));
  });

  it("should be able to trigger and subscribe to events", function(done) {
    var testData = {bar: "baz"};
    app.services.on("foo", function(data) {
      expect(data).to.deep.equal(testData);
      done();
    });
    app.services.trigger("foo", testData);
  });

  it("should retrieve a configured worker port", function() {
    var port = app.services.port;
    expect(port).to.deep.equal(fakePort);
    expect(port).to.include.keys(['onmessage', 'postMessage']);
    expect(port.onmessage).to.be.a('function');
  });

  it("should trigger an event when a message is received by the port",
    function(done) {
      var port = app.services.port;
      app.services.on("universe", function(data) {
        expect(data.answer).to.equal(42);
        done();
      });
      port.onmessage({data: {topic: "universe", data: {answer: 42}}});
    });

  it("should be able to post an event", function() {
    app.services.postEvent("answer", 42);
    sinon.assert.calledOnce(postMessageSpy);
    sinon.assert.calledWithExactly(postMessageSpy, {topic: "answer", data: 42});
  });

});
