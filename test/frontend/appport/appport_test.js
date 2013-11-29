/*global sinon, chai, AppPort */
"use strict";

var expect = chai.expect;

describe("AppPort", function() {
  var sandbox, mozSocialBackup, postMessageSpy;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    postMessageSpy = sinon.spy();
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: {postMessage: postMessageSpy}
        };
      }
    };
  });

  afterEach(function() {
    sandbox.restore();
    navigator.mozSocial = mozSocialBackup;
  });

  it("should implement Backbone.Events interface", function() {
    var proto = Object.keys(Backbone.Events);

    var appPort = new AppPort();

    expect(Object.getPrototypeOf(appPort)).to.include.keys(proto);
  });

  it("should be able to trigger and subscribe to events", function(done) {
    var testData = {bar: "baz"};

    (new AppPort()).on("foo", function(data) {
      expect(data).to.deep.equal(testData);
      done();
    }).trigger("foo", testData);
  });

  it("should trigger an event when a message is received by the port",
    function(done) {
      var appPort = new AppPort();

      appPort.on("universe", function(data) {
        expect(data.answer).to.equal(42);
        done();
      });

      appPort._port.onmessage({data: {topic: "universe", data: {answer: 42}}});
    });

  it("should be able to post an event", function() {
    var appPort = new AppPort();

    appPort.post("answer", 42);

    sinon.assert.calledOnce(postMessageSpy);
    sinon.assert.calledWithExactly(postMessageSpy, {topic: "answer", data: 42});
  });

});
