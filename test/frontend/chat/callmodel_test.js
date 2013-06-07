/* global app, chai, describe, it, sinon, beforeEach, afterEach */

/* jshint expr:true */
var expect = chai.expect;

describe("Call", function() {

  var sandbox, call, media;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      answer: sandbox.stub(),
      establish: sandbox.stub(),
      hangup: sandbox.stub(),
      offer: sandbox.stub(),
      on: sandbox.stub()
    };
    call = new app.models.Call({}, media);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should have a state machine", function() {
      expect(call.state).to.be.an.instanceOf(Object);
    });

    it("should store the media handler", function() {
      expect(call.media).to.deep.equal(media);
    });

    it("it should have an initial state", function() {
      expect(call.state.current).to.equal('ready');
    });

    it("should listen to offer-ready from the media", function() {
      sinon.assert.calledWith(media.on, "offer-ready");
    });

    it("should listen to answer-ready from the media", function() {
      sinon.assert.calledWith(media.on, "answer-ready");
    });
  });

  describe("#start", function() {
    var callData = {caller: "bob", callee: "larry"};

    it("should change the state from ready to pending", function() {
      call.start({});
      expect(call.state.current).to.equal('pending');
    });

    it("should store the id and otherUser", function() {
      call.start(callData);

      expect(call.get('id')).to.equal('bob');
      expect(call.get('otherUser')).to.equal('larry');
    });

    it("should pass the call data to the media", function() {
      call.start(callData);

      sinon.assert.calledOnce(media.offer);
      sinon.assert.calledWithExactly(media.offer, callData);
    });

    it("should raise an error if called twice", function() {
      call.start({});
      expect(call.start).to.Throw();
    });

  });

  describe("#incoming", function() {
    var callData = {caller: "bob", callee: "larry"};

    it("should change the state from ready to incoming", function() {
      call.incoming({});
      expect(call.state.current).to.equal('incoming');
    });

    it("should store the id and otherUser", function() {
      call.incoming(callData);

      expect(call.get('id')).to.equal('larry');
      expect(call.get('otherUser')).to.equal('bob');
    });

    it("should store the call data", function() {
      call.incoming(callData);

      expect(call.get("incomingData")).to.equal(callData);
    });

  });

  describe("#accept", function() {
    var callData = {caller: "bob", callee: "larry"};

    it("should change the state from incoming to pending", function() {
      call.state.incoming();
      call.accept();
      expect(call.state.current).to.equal('pending');
    });

    it("should pass the call data to the media", function() {
      call.incoming(callData);
      call.accept();

      sinon.assert.calledOnce(media.answer);
      sinon.assert.calledWithExactly(media.answer, callData);
    });
  });

  describe("#establish", function() {
    var answer = {answer: {type: "type", sdp: "sdp"}};

    it("should change the state from pending to ongoing", function() {
      call.start({});
      call.establish({});
      expect(call.state.current).to.equal('ongoing');
    });

    it("should pass the data to the media", function() {
      call.start({});
      call.establish(answer);

      sinon.assert.calledOnce(media.establish);
      sinon.assert.calledWithExactly(media.establish, answer);
    });

  });

  describe("#hangup", function() {
    it("should change the state from ready to terminated", function() {
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from pending to terminated", function() {
      call.start({});
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from ongoing to terminated", function() {
      call.start({});
      call.establish({});
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should call hangup on the media element", function() {
      call.start({});
      call.hangup();

      sinon.assert.calledOnce(media.hangup);
      sinon.assert.calledWithExactly(media.hangup);
    });
  });

  describe("ready event handling", function() {
    var fakeSdp = {type: "fake", sdp: "sdp"};

    beforeEach(function() {
      call.set({id: "bob", otherUser: "larry"});
      call.trigger = sandbox.stub();
    });

    describe("#offer-ready", function() {
      it("should trigger send-offer with transport data", function() {
        // Set up the data
        var expectedData = {
          caller: "bob",
          callee: "larry",
          offer: fakeSdp
        };

        // [0] gives the offer-ready call, [1] is the callback
        media.on.args[0][1](fakeSdp);

        sinon.assert.calledOnce(call.trigger);
        sinon.assert.calledWithExactly(call.trigger, "send-offer",
          expectedData);
      });
    });

    describe("#answer-ready", function() {
      var expectedData;

      beforeEach(function() {
        call.state.incoming();
        call.state.accept();

        // the state changes above, may activate the trigger, so reset it.
        call.trigger.reset();

        // Set up the data
        expectedData = {
          caller: "larry",
          callee: "bob",
          answer: fakeSdp
        };
      });

      it("should trigger send-offer with transport data", function() {
        // [1] gives the answer-ready call, [1] is the callback
        media.on.args[1][1](fakeSdp);

        sinon.assert.called(call.trigger);
        sinon.assert.calledWith(call.trigger, "send-answer",
          expectedData);
      });

      it("should change the state to ongoing", function() {
        // [1] gives the answer-ready call, [1] is the callback
        media.on.args[1][1](fakeSdp);

        expect(call.state.current).to.be.equal("ongoing");
      });
    });
  });
});
