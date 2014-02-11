/*global chai, sinon, EventRouter */
"use strict";

var expect = chai.expect;

describe("EventRouter", function() {
  var sandbox, obj, appPort;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    obj = {};
    appPort = {
      'postMessage': sandbox.spy(),
    };
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("Initialisation", function() {
    it("Should default to globally defined routes if none is passed",
      function() {

      var router = new EventRouter("Alice", obj, appPort);
      expect(router.routes).to.exist;
    });

    it("Should use the given routes object if one is given", function() {
      var sentinel = "this is a test";
      var router = new EventRouter("Alice", obj, appPort, sentinel);
      expect(router.routes).to.equal(sentinel);
    });

    it("Should listen to events from the appPort", function() {
      var onMessage = sandbox.stub(EventRouter.prototype, "_onMessage");
      new EventRouter("Alice", obj, appPort);

      var data = {
        from: "Alice",
        to: "Bob",
        callable: "feedMe"
      };

      appPort.onmessage("feedMe", data);
      sinon.assert.calledOnce(onMessage);

      // The onMessage method should be called with the topic set.
      data.topic = "feedMe";
      sinon.assert.calledWithExactly(onMessage, data);
    });

  });

  describe("appPort events", function() {
    it("Should trigger the right function of the context if it exists",
      function() {
      var routes = [{
        from: "Alice",
        topic: "feedme",
        to: "Bob",
        callable: "feedMe"
      }];
      obj.feedMe = sandbox.spy();

      new EventRouter("Bob", obj, appPort, routes);
      appPort.onmessage("feedMe", {
        from: "Alice",
        to: "Bob",
        callable: "feedMe",
        data: "sandwich"
      });

      sinon.assert.calledOnce(obj.feedMe);
      sinon.assert.calledWithExactly(obj.feedMe, "sandwich");
    });

    it("Should proxy events when in the 'via' property", function() {

    });
  });

  describe("#send", function() {
    it("Should call appPort with the proper route", function() {
      var routes = [{
        from: "Alice",
        topic: "feedme",
        to: "Bob",
        callable: "feedMe"
      }];
      var router = new EventRouter("Alice", obj, appPort, routes);
      router.send("feedme", "sandwich");
      sinon.assert.calledOnce(appPort.postMessage);

      var route = routes[0];
      route.data = "sandwich";
      sinon.assert.calledWithExactly(appPort.postMessage, route);
    });

    it("Should error-out when no route exists for the given event", function() {
      var router = new EventRouter("Alice", obj, appPort, []);
      expect(function() {
        // This route doesn't exist.
        router.send("feedme", "sandwich");
      }).to.throw("route not found");
    });
  });
});
