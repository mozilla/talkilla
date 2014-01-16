/* global sinon, app, chai */
var expect = chai.expect;

describe("app.models.AppStatus", function() {
  "use strict";

  var sandbox, clock;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    clock = sandbox.useFakeTimers();
  });

  describe("#ongoingReconnection", function() {
    var reconnectionMsg;

    beforeEach(function() {
      reconnectionMsg = new app.payloads.Reconnection(
        {timeout: 42, attempt: 1});
    });

    it("should not reconnect the first time an event is received", function() {
      var appStatus = new app.models.AppStatus();
      appStatus.ongoingReconnection(reconnectionMsg);

      expect(appStatus.get("reconnecting")).eql(false);
    });

    it("should not reconnect after 10 seconds", function() {
      var appStatus = new app.models.AppStatus();
      appStatus.ongoingReconnection(reconnectionMsg);
      clock.tick(10001);
      reconnectionMsg.attempt = 2;
      appStatus.ongoingReconnection(reconnectionMsg);
      expect(appStatus.get("reconnecting")).eql(reconnectionMsg);
    });
  });
});
