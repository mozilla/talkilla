/* global app, chai, describe, it, beforeEach */
var expect = chai.expect;

describe("Call", function() {
  var call;

  beforeEach(function() {
    call = new app.models.Call();
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

  describe("#accept", function() {

    it("should change the state from pending to ongoing", function() {
      call.start();
      call.accept();
      expect(call.state.current).to.equal('ongoing');
    });

  });

  describe("#hangup", function() {

    it("should change any state to terminated", function() {
      var pending = new app.models.Call();
      var ongoing = new app.models.Call();

      pending.start();
      ongoing.start();
      ongoing.accept();

      [pending, ongoing].forEach(function(call) {
        call.hangup();
        expect(call.state.current).to.equal('terminated');
      });
    });

    it("should not throw an error if hangup is called multiple times",
      function() {
        call.hangup();
        expect(call.hangup).to.not.Throw();
      });

  });

  describe('#_onHangup', function (){
      it('should call app.media.closePeerConnection', function() {

      });
  });
});
