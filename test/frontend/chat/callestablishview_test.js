/*global app, chai, sinon, WebRTC */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe('Call Establish View', function() {
  var media, sandbox, call, peer, audioLibrary;

  beforeEach(function() {
    $('body').append([
      '<div id="establish">',
      '  <p class="avatar"><img src="" id="avatar"></p>',
      '  <p class="outgoing-info"><img src="/img/video-icon.png">',
      '    <span class="text"></span></p>',
      '  <p class="actions"><a class="btn btn-abort">End Call</a></p>',
      '  <p class="actions"><a class="btn btn-call-again">Call Again</a></p>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    peer = new app.models.User();
    peer.set({nick: "Mark"});

    var media = sandbox.stub(new WebRTC());
    call = new app.models.Call({}, {media: media, peer: peer});

    audioLibrary = new app.utils.AudioLibrary();
  });

  afterEach(function() {
    $('#establish').remove();
    call = undefined;
    media = undefined;
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should attach a given call model", function() {
      var establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });

      expect(establishView.call).to.equal(call);
    });

    it("should attach a given peer model", function() {
      var establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });

      expect(establishView.peer).to.equal(peer);
    });

    it("should attach a given audio library", function() {
      var establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });

      expect(establishView.audioLibrary).to.equal(audioLibrary);
    });

    it("should throw an error when no peer is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView({call: call});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: peer/);
    });

    it("should throw an error when no call is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView({peer: peer});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should throw an error when no audioLibrary is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView({call: call, peer: peer});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: audioLibrary/);
    });
  });

  describe("#_startTimer", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });
    });

    it("should setup a timer and change the call state to timeout",
      function() {
        expect(establishView.timer).to.be.a("undefined");

        call.state.start();
        establishView._startTimer({timeout: 3000});

        expect(establishView.timer).to.be.a("number");

        sandbox.clock.tick(3000);

        expect(call.state.current).to.be.equal("timeout");
      });
  });

  describe("#_onSendOffer", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });

      sandbox.stub(audioLibrary, "play");
      sandbox.stub(audioLibrary, "enableLoop");
      sandbox.stub(establishView, "_startTimer");
    });

    it("should start the outgoing call sound", function() {
      call.trigger("send-offer");

      sinon.assert.calledOnce(audioLibrary.play);
      sinon.assert.calledWithExactly(audioLibrary.play, "outgoing");
    });

    it("should add loop to the audio element", function() {
      call.trigger("send-offer");

      sinon.assert.calledOnce(audioLibrary.enableLoop);
      sinon.assert.calledWithExactly(audioLibrary.enableLoop, "outgoing");
    });

    it("should start a timer for call timeout", function() {
      call.trigger("send-offer");

      sinon.assert.calledOnce(establishView._startTimer);
    });
  });

  describe("#_handleStateChanges", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });

      sandbox.stub(audioLibrary, "stop");
      sandbox.stub(window, "clearTimeout");
    });

    it("should show the element when the state changes from ready to pending",
      function() {
        establishView.$el.hide();

        call.state.start();

        expect(establishView.$el.is(":visible")).to.be.equal(true);
      });

    // This is for the case where the estabilsh view is used for both pending,
    // and the call timeout displays.
    it("should show the element when the state changes to timeout",
      function() {
        call.state.start();
        establishView.$el.hide();

        call.state.timeout();

        expect(establishView.$el.is(":visible")).to.be.equal(true);
      });

    it("should show the element when the state changes from timeout to pending",
      function() {
        call.state.start();
        call.state.timeout();

        establishView.$el.hide();

        call.state.start();

        expect(establishView.$el.is(":visible")).to.be.equal(true);
      });

    it("should hide the element when the state changes from pending",
      function() {
        establishView.$el.show();

        call.state.start();
        call.state.hangup();

        expect(establishView.$el.is(":visible")).to.be.equal(false);
      });

    it("should stop the outgoing sound when the state leaves pending",
      function() {
        call.state.start();
        call.state.hangup();

        sinon.assert.calledOnce(audioLibrary.stop);
        sinon.assert.calledWithExactly(audioLibrary.stop, "outgoing");
      });

    it("should clear the timeout when the state leaves pending",
      function() {
        // Set up the timer, so that we have something to test that we're
        // clearing.
        establishView._startTimer({timeout: 3000});

        call.state.start();
        call.state.hangup();

        sinon.assert.calledOnce(clearTimeout);
        sinon.assert.calledWithExactly(clearTimeout, establishView.timer);
      });
  });

  describe("events", function() {
    var establishView, event;

    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });
      event = { preventDefault: sinon.spy() };
      sandbox.stub(window, "close");
      sandbox.stub(call, "restart");
    });

    it("should call window.close when a click event is fired on the " +
       "abort button", function() {
      establishView._abort(event);

      sinon.assert.calledOnce(window.close);
      sinon.assert.calledWithExactly(window.close);
    });

    it("should call call.restart when a click event is fired on the " +
       "call again button", function() {
      establishView._callAgain(event);

      sinon.assert.calledOnce(call.restart);
    });
  });

  describe("#render", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });
    });

    // XXX: needs to have the Call model having its peer set as a User
    // model instance so we can actually get the avatar
    it("should render with the callee's avatar");

    describe("on state set to pending", function() {
      it("should show 'Calling Mark…'", function() {
        call.state.start();

        expect(establishView.$('.text').text()).
          to.equal("Calling Mark…");
      });

      it("should show the end call button", function() {
        $('.btn-abort').hide();

        call.state.start();

        expect($('.btn-abort').is(':visible')).to.be.equal(true);
      });

      it("should hide the call again button", function() {
        $('.btn-call-again').show();

        call.state.start();

        expect($('.btn-call-again').is(':visible')).to.be.equal(false);
      });
    });

    describe("on state set to timeout", function() {
      it("should show 'Call was not answered'", function() {
        call.state.start();
        call.state.timeout();

        expect(establishView.$('.text').text()).
          to.equal("Call was not answered");
      });

      it("should hide the end call button", function() {
        $('.btn-abort').show();

        call.state.start();
        call.state.timeout();

        expect($('.btn-abort').is(':visible')).to.be.equal(false);
      });

      it("should show the call again button", function() {
        $('.btn-call-again').hide();

        call.state.start();
        call.state.timeout();

        expect($('.btn-call-again').is(':visible')).to.be.equal(true);
      });
    });

  });

});
