/*global chai, sinon, PortCollection, tkWorker, onconnect */

var expect = chai.expect;

describe("Frame Worker Events", function() {
  describe("#onconnect", function() {
    "use strict";
    var sandbox, event, ports, oldPorts;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();

      event = {
        ports: [{_portid: 1}]
      };

      ports = new PortCollection();
      oldPorts = tkWorker.ports;
      tkWorker.ports = ports;

      sandbox.stub(tkWorker, "loadSPA");
    });

    afterEach(function() {
      tkWorker.ports = oldPorts;
      sandbox.restore();
    });

    it("should add the port to the tkWorker ports", function () {
      onconnect(event);

      expect(ports.find(1).id).to.equal(1);
    });

    it("should load the SPA details", function() {
      onconnect(event);

      sinon.assert.calledOnce(tkWorker.loadSPA);
    });
  });
});

