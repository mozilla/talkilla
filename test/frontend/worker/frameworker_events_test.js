/*global chai, sinon, PortCollection, tkWorker:true, TkWorker, onconnect */
"use strict";

var expect = chai.expect;

describe("Frame Worker Events", function() {

  describe("#onconnect", function() {
    var sandbox, event, oldTkWorker;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      event = {
        ports: [{_portid: 1}]
      };

      oldTkWorker = tkWorker;
      tkWorker = new TkWorker({
        ports: new PortCollection()
      });
    });

    afterEach(function() {
      tkWorker = oldTkWorker;
      sandbox.restore();
    });

    it("should add the port to the tkWorker ports", function () {
      onconnect(event);

      expect(tkWorker.ports.find(1).id).to.equal(1);
    });
  });
});

