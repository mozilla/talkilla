/* global app, chai, describe, it, beforeEach, afterEach, sinon */
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

  // XXX test that getting some event from view sets _localStream

  // XXX test that getting some event from ???? sets remoteStream

  // XXX test that something sets _pc for incoming calls

  // XXX test that something sets _pc for outcoming calls

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

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should call app.media.closePeerConnection', function() {
      var media = {closePeerConnection: sinon.spy()};
      call._onHangup(media);
      sinon.assert.calledOnce(media.closePeerConnection);
      sinon.assert.calledWithExactly(media.closePeerConnection, call._pc,
        call._localStream, call._remoteStream);
    });

    it("should set the peer connection to null", function() {
      var media = {closePeerConnection: function() {}};
      call._onHangup(media);
      expect(call._pc).to.equal(null);
    });

    it("should set the callee to null", function() {
      var media = {closePeerConnection: function() {}};
      call._onHangup(media);
      expect(call.callee).to.equal(null);
    });

    it("should cause app to trigger a hangup_done event", function() {
      sandbox.stub(app, "trigger");
      var media = {closePeerConnection: function() {}};
      call._onHangup(media);
      sinon.assert.calledOnce(app.trigger);
      sinon.assert.calledWithExactly(app.trigger, "hangup_done");
    });
  });
});
