/* global _, Backbone, app, chai, describe, it, sinon, beforeEach, afterEach */

/* jshint expr:true */
var expect = chai.expect;

describe("Call", function() {

  var sandbox, call, media, oldPort, peer;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();
    oldPort = app.port;
    app.port = {postEvent: sinon.spy()};
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      terminate: sandbox.spy(),
      on: sandbox.stub()
    };

    peer = new app.models.User();

    call = new app.models.Call({}, {media: media, peer: peer});
  });

  afterEach(function() {
    sandbox.restore();
    app.port = oldPort;
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

    it("should set instance attributes", function() {
      var call = new app.models.Call({peer: "larry"}, {media: media});
      expect(call.get("peer")).to.equal("larry");
    });
  });

  describe("#start", function() {
    var callData = {video: true, audio: true};

    it("should change the state from ready to pending", function() {
      call.start({});
      expect(call.state.current).to.equal('pending');
    });

    it("should pass the call data to the media", function() {
      call.start(callData);

      sinon.assert.calledOnce(media.initiate);
      sinon.assert.calledWithExactly(media.initiate, callData);
    });

    it("should raise an error if called twice", function() {
      call.start({});
      expect(call.start).to.Throw();
    });

  });

  describe("#incoming", function() {
    var callData = {video: true, audio: true};

    it("should change the state from ready to incoming", function() {
      call.incoming({});
      expect(call.state.current).to.equal('incoming');
    });

    it("should store the call data", function() {
      call.incoming(callData);

      expect(call.get("incomingData")).to.equal(callData);
    });

  });

  describe("#accept", function() {
    var callData = {video: true, audio: true, peer: "bob", offer: {foo: 42}};

    it("should change the state from incoming to pending", function() {
      call.state.incoming();
      call.accept();
      expect(call.state.current).to.equal('pending');
    });

    it("should pass the call data to the media", function() {
      call.incoming(callData);
      call.accept();

      sinon.assert.calledOnce(media.answer);
      sinon.assert.calledWithExactly(media.answer, callData.offer);
    });

  });

  describe("#establish", function() {
    var answerData = {answer: {type: "answer", sdp: "sdp"}};

    it("should not accept an invalid answer", function() {
      call.start({});
      function establish() {
        call.establish({});
      }
      expect(establish).throws(Error);
    });

    it("should change the state from pending to ongoing", function(done) {
      _.extend(media, Backbone.Events);
      call.start({});
      call.once('state:to:ongoing', done);
      call.establish(answerData);
      call.media.trigger('connection-established');
    });

    it("should pass the data to the media", function() {
      _.extend(media, Backbone.Events);
      media.establish = sandbox.stub();
      call.start({});
      call.establish(answerData);

      sinon.assert.calledOnce(media.establish);
      sinon.assert.calledWithExactly(media.establish, answerData.answer);
    });

  });

  describe("#ignore", function() {
    it("should change the state from incoming to terminated", function() {
      call.incoming({});
      call.ignore();
      expect(call.state.current).to.equal('terminated');
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
      _.extend(media, Backbone.Events);
      call.start({});
      call.establish({answer: {type: "answer", sdp: "sdp"}});
      call.hangup();
      expect(call.state.current).to.equal('terminated');
    });

    it("should call hangup on the media element", function() {
      media.terminate = sandbox.stub();
      call.start({});
      call.hangup();

      sinon.assert.calledOnce(media.terminate);
      sinon.assert.calledWithExactly(media.terminate);
    });

  });

  describe("#_startTimer", function() {
    beforeEach(function() {
      peer.set({nick: "bob"});
    });

    afterEach(function() {
      peer.set({nick: undefined});
    });

    it("should setup a timer and trigger the `offer-timeout` event on timeout",
      function(done) {
        sandbox.stub(call, "trigger");
        expect(call.timer).to.be.a("undefined");

        call._startTimer({timeout: 3000});

        expect(call.timer).to.be.a("number");

        sandbox.clock.tick(3000);

        sinon.assert.calledOnce(call.trigger);
        sinon.assert.calledWithExactly(call.trigger, "offer-timeout",
                                       {peer: "bob"});
        done();
      });
  });

  describe("ready event handling", function() {
    var fakeSdp = {type: "fake", sdp: "sdp"}, userModel;

    beforeEach(function() {
      peer.set({nick: "larry"});
      call.trigger = sandbox.stub();
      app.data.user = userModel = new app.models.User();
      app.data.user.set("nick", "bob");
    });

    afterEach(function() {
      peer.set({nick: undefined});
      delete app.data.user;
      userModel = undefined;
    });

    describe("#offer-ready", function() {
      it("should trigger send-offer with transport data", function() {
        // Set up the data
        var expectedData = {
          peer: "larry",
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
          peer: "larry",
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
