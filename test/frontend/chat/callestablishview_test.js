/* global app, chai, describe, it, sinon, beforeEach, afterEach, $,
          WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe('Call Establish View', function() {
  "use strict";
  var media, sandbox, call, peer, audioLibrary;

  beforeEach(function() {
    $('body').append([
      '<div id="establish">',
      '  <p class="avatar"><img src="" id="avatar"></p>',
      '  <p class="outgoing-info"><img src="/img/video-icon.png">',
      '    <span class="outgoing-text"></span></p>',
      '  <p class="actions"><a class="btn btn-abort">End Call</a></p>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    sandbox.useFakeTimers();

    var media = sandbox.stub(new WebRTC());
    call = new app.models.Call({}, {media: media});

    peer = new app.models.User();
    peer.set({nick: "Mark"});

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

      sandbox.stub(audioLibrary, "stop");
      sandbox.stub(window, "close");
    });

    it("should setup a timer and stop the outgoing call sound on timeout",
      function() {
        expect(establishView.timer).to.be.a("undefined");

        establishView._startTimer({timeout: 3000});

        expect(establishView.timer).to.be.a("number");

        sandbox.clock.tick(3000);

        sinon.assert.calledOnce(audioLibrary.stop);
        sinon.assert.calledWithExactly(audioLibrary.stop, "outgoing");
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
      sandbox.stub(establishView, "_startTimer");
    });

    it("should start the outgoing call sound", function() {
      call.trigger("send-offer");

      sinon.assert.calledOnce(audioLibrary.play);
      sinon.assert.calledWithExactly(audioLibrary.play, "outgoing");
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

    it("should show the element when the state changes to pending from ready",
      function() {
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

  describe("#_abort", function() {
    var establishView, event;

    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer,
        audioLibrary: audioLibrary
      });
      event = { preventDefault: sinon.spy() };
      sandbox.stub(window, "close");
    });

    it("should call preventDefault on any event passed", function() {
      establishView._abort(event);

      sinon.assert.calledOnce(event.preventDefault);
      sinon.assert.calledWithExactly(event.preventDefault);
    });

    it("should call window.close", function() {
      establishView._abort(event);

      sinon.assert.calledOnce(window.close);
      sinon.assert.calledWithExactly(window.close);
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

    it("should show 'Calling Mark…' when rendering", function() {
      establishView.render();

      expect(establishView.$('.outgoing-text').text()).
        to.equal("Calling Mark…");
    });

    it("should render with the callee's avatar");
    // XXX: needs to have the Call model having its peer set as a User
    // model instance so we can actually get the avatar
  });

});
