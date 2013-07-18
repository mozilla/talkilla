/* global Backbone, describe, it, beforeEach, afterEach, sinon, chai, Port */
var expect = chai.expect;

describe("app.port", function() {
  "use strict";

  var sandbox, mozSocialBackup, fakePort, postMessageSpy;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    postMessageSpy = sinon.spy();
    fakePort = {postMessage: postMessageSpy};
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: fakePort
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

    var port = new Port();

    expect(Object.getPrototypeOf(port)).to.include.keys(proto);
  });

  it("should be able to trigger and subscribe to events", function(done) {
    var testData = {bar: "baz"};

    (new Port()).on("foo", function(data) {
      expect(data).to.deep.equal(testData);
      done();
    }).trigger("foo", testData);
  });

  it("should trigger an event when a message is received by the port",
    function(done) {
      var port = new Port();

      port.on("universe", function(data) {
        expect(data.answer).to.equal(42);
        done();
      });

      port._port.onmessage({data: {topic: "universe", data: {answer: 42}}});
    });

  it("should be able to post an event", function() {
    var port = new Port();

    port.postEvent("answer", 42);

    sinon.assert.calledOnce(postMessageSpy);
    sinon.assert.calledWithExactly(postMessageSpy, {topic: "answer", data: 42});
  });

});
