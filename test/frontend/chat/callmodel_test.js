/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, mozRTCSessionDescription, $, _, Backbone, mozRTCPeerConnection */

/* jshint expr:true */
var expect = chai.expect;

describe("Call", function() {

  var sandbox, call;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    call = new app.models.Call();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it("should have a state machine", function() {
    expect(call.state).to.be.an.instanceOf(Object);
  });

  it("it should have an initial state", function() {
    expect(call.state.current).to.equal('ready');
  });

  describe("#start", function() {

    it("should change the state from ready to pending", function() {
      call.start();
      expect(call.state.current).to.equal('pending');
    });

    it("should raise an error if called twice", function() {
      call.start();
      expect(call.start).to.Throw();
    });
  });

  describe("#incoming", function() {

    it("should change the state from ready to pending", function() {
      call.incoming();
      expect(call.state.current).to.equal('pending');
    });

  });

  describe("#accept", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.accept();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#establish", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.establish();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#hangup", function() {
    it("should change the state from ready to terminated", function() {
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from pending to terminated", function() {
      call.start();
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from ongoing to terminated", function() {
      call.start();
      call.accept();
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });
  });

});
