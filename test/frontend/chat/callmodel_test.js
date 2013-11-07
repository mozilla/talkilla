/*global app, chai, sinon, payloads, WebRTC */
/* jshint expr:true */

var expect = chai.expect;

describe("Call Model", function() {
  "use strict";

  var sandbox, call, media, peer, callData;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      state: {current: 'ready'},
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      upgrade: sandbox.spy(),
      terminate: sandbox.spy(),
      reset: sandbox.spy(),
      on: sandbox.stub(),
      once: sandbox.stub()
    };

    peer = new app.models.User();

    call = new app.models.Call({}, {media: media, peer: peer});

    callData = new app.payloads.Offer({
      offer: {
        sdp: "fake",
        type: "offer"
      },
      callid: 2,
      peer: "bob",
      textChat: true,
      upgrade: false
    });
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

    it("should set instance attributes", function() {
      var call = new app.models.Call({peer: "larry"}, {media: media});
      expect(call.get("peer")).to.equal("larry");
    });

    it("should have a random id", function() {
      sandbox.stub(app.utils, "id").returns(1);
      var call = new app.models.Call({}, {media: media, peer: peer});
      expect(call.callid).to.not.equal(undefined);
      sinon.assert.calledOnce(app.utils.id);
    });
  });

  describe("#start", function() {
    it("should change the state from ready to pending", function() {
      call.start({});
      expect(call.state.current).to.equal('pending');
    });

    it("should listen to offer-ready from the media", function() {
      call.start({});
      sinon.assert.calledWith(media.once, "offer-ready");
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

    it("should silently upgrade a call if currently ongoing", function() {
      sandbox.stub(call, "upgrade");
      call.media.state.current = "ongoing";
      var fakeConstraints = {fakeConstraint: true};

      call.start(fakeConstraints);

      sinon.assert.calledOnce(call.upgrade);
      sinon.assert.calledWithExactly(call.upgrade, fakeConstraints);
    });

    it("should cause a requiresVideo() call to give an updated answer",
      function() {
        sandbox.stub(call, "upgrade");
        call.media.state.current = "ongoing";
        var constraints = {video: true};
        expect(call.requiresVideo()).to.equal(false);

        call.start(constraints);

        expect(call.requiresVideo()).to.equal(true);
      });

    it("should generate a new call id", function() {
      var oldid = call.callid;
      call.start({});
      expect(call.callid).to.not.equal(oldid);
    });

    describe("send-offer", function() {
      var fakeOffer = {peer: "larry", offer: {fake: true}};

      beforeEach(function() {
        call.media = _.extend(media, Backbone.Events);
        peer.set("nick", "larry");

        call.start({});
      });

      it("should trigger send-offer with transport data on offer-ready",
        function(done) {
          call.once("send-offer", function(data) {
            expect(data.offer).to.deep.equal(fakeOffer);
            done();
          });

          call.media.trigger("offer-ready", fakeOffer);
        });
    });
  });

  describe("#restart", function() {
    beforeEach(function() {
      call.start(callData);
      call.timeout();
      media.initiate.reset();
    });

    it("should change the state from timeout to pending", function() {
      call.restart();
      expect(call.state.current).to.equal('pending');
    });

    it("should listen to offer-ready from the media", function() {
      call.restart();
      sinon.assert.calledWith(media.once, "offer-ready");
    });

    it("should pass the previously saved call data to the media", function() {
      expect(call.get('currentConstraints')).to.deep.equal(callData);
      call.restart();

      sinon.assert.calledOnce(media.initiate);
      sinon.assert.calledWithExactly(media.initiate, callData);
    });

    it("should raise an error if called twice", function() {
      call.restart();
      expect(call.restart).to.Throw();
    });

    describe("send-offer", function() {
      var fakeOffer = {peer: "larry", offer: {fake: true}};

      beforeEach(function() {
        call.media = _.extend(media, Backbone.Events);
        peer.set("nick", "larry");

        call.start({});
      });

      it("should trigger send-offer with transport data on offer-ready",
        function(done) {
          call.once("send-offer", function(data) {
            expect(data.offer).to.deep.equal(fakeOffer);
            done();
          });

          call.media.trigger("offer-ready", fakeOffer);
        });
    });
  });

  describe("#incoming", function() {
    it("should change the state from ready to incoming", function() {
      call.state.current = 'ready';

      call.incoming(callData);

      expect(call.state.current).to.equal('incoming');
    });

    it("should change the state from timeout to incoming", function() {
      call.state.current = 'timeout';

      call.incoming(callData);

      expect(call.state.current).to.equal('incoming');
    });

    it("should store the parsed constraints", function() {
      var constraints = {video: false, audio: true};
      sandbox.stub(WebRTC, "parseOfferConstraints").returns(constraints);

      call.incoming(callData);

      expect(call.get("currentConstraints")).to.deep.equal(constraints);
    });

    it("should store the call data", function() {
      call.incoming(callData);

      expect(call.get("incomingData").offer).to.equal(callData.offer);
      expect(call.get("incomingData").textChat).to.equal(callData.textChat);
      expect(call.get("incomingData").upgrade).to.equal(callData.upgrade);
    });

    it("should have the same id as the incoming call", function() {
      call.incoming(callData);
      expect(call.callid).to.equal(2);
    });

  });

  describe("#accept", function() {
    it("should listen to answer-ready from the media", function() {
      call.state.incoming();
      call.accept();
      sinon.assert.calledWith(media.once, "answer-ready");
    });

    it("should change the state from incoming to pending", function() {
      call.state.incoming();
      call.accept();
      expect(call.state.current).to.equal('pending');
    });

    it("should trigger send-answer with transport data on answer-ready",
      function(done) {
        call.media = _.extend(media, Backbone.Events);
        peer.set("nick", "larry");
        var fakeAnswer = {peer: "larry", answer: {fake: true}};
        call.once("send-answer", function(data) {
          expect(data.answer).to.deep.equal(fakeAnswer);
          done();
        });

        call.incoming(callData);
        call.accept({});

        call.media.trigger("answer-ready", fakeAnswer);
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
      call.start({});
      call.establish(answerData);

      sinon.assert.calledOnce(media.establish);
      sinon.assert.calledWithExactly(media.establish, answerData.answer);
    });

  });

  describe("#timeout", function() {
    beforeEach(function() {
      call.start({});
      call.peer.set("nick", "Mark");
      call.callid = 2;
    });

    it("should change the state from pending to terminated", function() {
      call.timeout();

      expect(call.state.current).to.equal('timeout');
    });

    it("should terminate the media", function() {
      call.timeout();

      sinon.assert.calledOnce(media.terminate);
    });

    it("should trigger send-timeout", function(done) {
      call.on("send-timeout", function(hangupMsg) {
        expect(hangupMsg instanceof payloads.Hangup).to.equal(true);
        expect(hangupMsg.peer).to.equal("Mark");
        expect(call.callid).to.equal(2);
        done();
      });

      call.timeout();
    });
  });

  describe("#ignore", function() {
    it("should change the state from incoming to terminated", function() {
      call.incoming(callData);
      call.ignore();
      expect(call.state.current).to.equal('terminated');
    });
  });

  describe("#hangup", function() {
    it("should not hangup if the state is ready", function() {
      call.state.current = 'ready';

      call.hangup(false);

      expect(call.state.current).to.equal('ready');
    });

    it("should not hangup if the state is timeout", function() {
      call.state.current = 'timeout';

      call.hangup(false);

      expect(call.state.current).to.equal('timeout');
    });

    it("should not hangup if the state is terminated", function() {
      call.state.current = 'terminated';

      call.hangup(false);

      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from pending to terminated", function() {
      call.start({});
      call.hangup(false);
      expect(call.state.current).to.equal('terminated');
    });

    it("should change the state from ongoing to terminated", function() {
      _.extend(media, Backbone.Events);
      call.start({});
      call.establish({answer: {type: "answer", sdp: "sdp"}});
      call.hangup(false);
      expect(call.state.current).to.equal('terminated');
    });

    it("should call hangup on the media element", function() {
      media.terminate = sandbox.stub();
      call.start({});
      call.hangup(false);

      sinon.assert.calledOnce(media.terminate);
      sinon.assert.calledWithExactly(media.terminate);
    });

    it("should trigger send-hangup", function(done) {
      call.start({});
      call.peer.set("nick", "Mark");
      call.callid = 2;

      call.on("send-hangup", function(hangupMsg) {
        expect(hangupMsg instanceof payloads.Hangup).to.equal(true);
        expect(hangupMsg.peer).to.equal("Mark");
        expect(hangupMsg.callid).to.equal(call.callid);
        done();
      });

      call.hangup(true);
    });
  });

  describe("#upgrade", function() {
    it("should change the state from ready to pending", function() {
      call.state.current = 'ongoing';
      call.upgrade({});
      expect(call.state.current).to.equal('pending');
    });

    it("should listen to offer-ready from the media", function() {
      call.state.current = 'ongoing';
      call.upgrade({});
      sinon.assert.calledWith(media.once, "offer-ready");
    });

    it("should pass new media constraints to the media", function() {
      call.state.current = 'ongoing';
      call.upgrade({audio: true});

      sinon.assert.calledOnce(media.upgrade);
      sinon.assert.calledWithExactly(media.upgrade, {audio: true});
    });

    describe("send-offer", function() {
      var fakeOffer = {offer: {fake: true}};

      beforeEach(function() {
        call.state.current = 'ongoing';
        call.media = _.extend(media, Backbone.Events);
        peer.set("nick", "larry");
        call.id = 2;

        call.upgrade({});
      });

      it("should trigger send-offer with transport data on offer-ready",
        function(done) {
          call.once("send-offer", function(data) {
            expect(data.offer).to.deep.equal(fakeOffer);
            expect(data.peer).to.equal(peer.get("nick"));
            expect(data.callid).to.equal(call.callid);
            done();
          });

          call.media.trigger("offer-ready", fakeOffer);
        });
    });
  });

  describe("#requiresVideo", function() {
    it("should check if current call has video constraints", function() {
      call.set('currentConstraints', {video: true, audio: true});

      expect(call.requiresVideo()).to.equal(true);
    });

    it("should check if current call has no video constraint", function() {
      call.set('currentConstraints', {video: false, audio: true});

      expect(call.requiresVideo()).to.equal(false);
    });
  });
});
