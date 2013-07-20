/* global Backbone, describe, it, beforeEach, afterEach, sinon, chai, AppPort */
var expect = chai.expect;

describe("AppPort", function() {
  "use strict";

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

    var port = new AppPort();

    expect(Object.getPrototypeOf(port)).to.include.keys(proto);
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
      var port = new AppPort();

      port.on("universe", function(data) {
        expect(data.answer).to.equal(42);
        done();
      });

      port._port.onmessage({data: {topic: "universe", data: {answer: 42}}});
    });

  it("should be able to post an event", function() {
    var port = new AppPort();

    port.postEvent("answer", 42);

    sinon.assert.calledOnce(postMessageSpy);
    sinon.assert.calledWithExactly(postMessageSpy, {topic: "answer", data: 42});
  });

});
