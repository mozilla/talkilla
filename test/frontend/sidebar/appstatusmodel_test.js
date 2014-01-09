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
		it("should not reconnect the first time an event is received", function() {
			var appStatus = new app.models.AppStatus();
			appStatus.ongoingReconnection({timeout: 42, attempt: 1});

			expect(appStatus.get("reconnecting")).eql(false);
		});

		it("should not reconnect after 10 seconds", function() {
			var appStatus = new app.models.AppStatus();
			appStatus.ongoingReconnection({timeout: 42, attempt: 1});
			clock.tick(10001);
			appStatus.ongoingReconnection({timeout: 42, attempt: 2});
			expect(appStatus.get("reconnecting")).eql(42);
		});
	});
});
