/* global app, chai, describe, it, sinon, before, beforeEach, afterEach,
   $ */

var expect = chai.expect;

describe("Call Controls View", function() {
  "use strict";
  var sandbox, call, media, el;

  before(function() {
    el = $('<ul>' +
           '<li class="btn-video"><a href="#"></a></li>' +
           '<li class="btn-audio"><a href="#"></a></li>' +
           '<li class="btn-hangup"><a href="#"></a></li>' +
           '<li class="btn-audio-mute"><a href="#"></a></li>' +
           '</ul>');
    // Just to hide it from the screen.
    $(el).hide();
    $('#fixtures').append(el);
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      terminate: sandbox.spy(),
      setMuteState: sandbox.spy(),
      on: sandbox.stub(),
      state: {current: "ready"}
    };
    call = new app.models.Call({}, {media: media});
  });

  afterEach(function() {
    media = undefined;
    call = undefined;
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should attach a given call model", function() {
      var callControlsView = new app.views.CallControlsView({
        el: 'fakeDom',
        call: call,
        media: media
      });

      expect(callControlsView.call).to.equal(call);
    });

    it("should attach a given media object", function() {
      var callControlsView = new app.views.CallControlsView({
        el: 'fakeDom',
        call: call,
        media: media
      });

      expect(callControlsView.media).to.equal(media);
    });

    it("should attach a given element", function() {
      var callControlsView = new app.views.CallControlsView({
        el: 'fakeDom',
        call: call,
        media: media
      });

      expect(callControlsView.call).to.equal(call);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.CallControlsView({el: 'fakeDom'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should throw an error when no media object is given", function() {
      function shouldExplode() {
        new app.views.CallControlsView({el: 'fakeDom', call: 'fakeCall'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: media/);
    });

    it("should throw an error when no el parameter is given", function() {
      function shouldExplode() {
        new app.views.CallControlsView({
          call: 'fakeWebrtc',
          media: 'fakeMedia'
        });
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: el/);
    });

    describe("attach call states", function() {
      var callControlsView;

      beforeEach(function() {
        sandbox.stub(call, "on");
        callControlsView = new app.views.CallControlsView({
          el: 'fakeDom',
          call: call,
          media: media
        });
      });

      it("should attach _callPending() to the call's incoming and" +
         " pending states", function() {
          sinon.assert.called(call.on);
          sinon.assert.calledWith(call.on,
                                  "state:to:pending state:to:incoming",
                                  callControlsView._callPending);
        });

      it("should attach _callOngoing() to the call's ongoing state",
         function() {
          sinon.assert.called(call.on);
          sinon.assert.calledWith(call.on,
                                  "state:to:ongoing",
                                  callControlsView._callOngoing);
        });

      it("should attach _callInactive() to the call's incoming and" +
         " pending states", function() {
          sinon.assert.called(call.on);
          sinon.assert.calledWith(call.on,
                                  "state:to:terminated",
                                  callControlsView._callInactive);
        });
    });
  });

  describe("events", function() {
    var callControlsView;

    beforeEach(function() {
      sandbox.stub(app.views.CallControlsView.prototype, "initialize");
      sandbox.stub(app.views.CallControlsView.prototype, "videoCall");
      sandbox.stub(app.views.CallControlsView.prototype, "audioCall");
      sandbox.stub(app.views.CallControlsView.prototype, "hangup");
      sandbox.stub(app.views.CallControlsView.prototype, "audioMuteToggle");
      callControlsView = new app.views.CallControlsView({el: el});
    });

    it("should call videoCall() what a click event is fired on the video" +
       "button", function() {
        $(el).find('.btn-video a').trigger("click");

        sinon.assert.calledOnce(callControlsView.videoCall);
      });

    it("should call audioCall() what a click event is fired on the audio" +
       "button", function (){
        $(el).find('.btn-audio a').trigger("click");

        sinon.assert.calledOnce(callControlsView.audioCall);
      });

    it("should call hangup() when a click event is fired on the hangup button",
      function() {
        $(el).find('.btn-hangup a').trigger("click");

        sinon.assert.calledOnce(callControlsView.hangup);
      });

    it("should call audioMuteToggle() when a click event is fired on the" +
      " audio mute button", function() {
        $(el).find('.btn-audio-mute a').trigger("click");

        sinon.assert.calledOnce(callControlsView.audioMuteToggle);
      });

  });

  describe("Call Control Handling", function() {
    var callControlsView, fakeClickEvent;

    beforeEach(function() {
      var el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);

      callControlsView = new app.views.CallControlsView({
        el: $("#fixtures"),
        call: call,
        media: media
      });

      fakeClickEvent = {preventDefault: sandbox.spy()};
    });

    describe("#videoCall", function() {
      it("should start the video call", function() {
        sandbox.stub(call, "start");

        callControlsView.videoCall(fakeClickEvent);

        sinon.assert.calledOnce(fakeClickEvent.preventDefault);
        sinon.assert.calledOnce(call.start);
        sinon.assert.calledWithExactly(call.start,
          {audio: true, video: true});
      });

      it("should upgrade to a video call", function() {
        sandbox.stub(call, "upgrade");
        call.media.state.current = "ongoing";

        callControlsView.videoCall(fakeClickEvent);

        sinon.assert.calledOnce(fakeClickEvent.preventDefault);
        sinon.assert.calledOnce(call.upgrade);
        sinon.assert.calledWithExactly(call.upgrade,
          {audio: true, video: true});
      });
    });

    describe("#audioCall", function() {
      it("should start the audio call", function() {
        sandbox.stub(call, "start");

        callControlsView.audioCall(fakeClickEvent);

        sinon.assert.calledOnce(fakeClickEvent.preventDefault);
        sinon.assert.calledOnce(call.start);
        sinon.assert.calledWithExactly(call.start,
          {audio: true, video: false});
      });
    });

    describe("#hangup", function() {
      it('should close the window', function() {
        sandbox.stub(window, "close");

        callControlsView.hangup();

        sinon.assert.calledOnce(window.close);
      });
    });

    describe("#audioMuteToggle", function() {
      beforeEach(function() {
        $('.btn-audio-mute').removeClass('active');
      });

      it('should toggle the class on the button', function() {
        callControlsView.audioMuteToggle();

        expect($('.btn-audio-mute').hasClass("active")).to.be.equal(true);
      });

      it('should set the audio mute state', function() {
        callControlsView.audioMuteToggle();

        sinon.assert.calledOnce(media.setMuteState);
        sinon.assert.calledWithExactly(media.setMuteState, 'audio', true);
      });
    });
  });

  describe("Call State Handling", function() {
    var callControlsView;

    beforeEach(function() {
      sandbox.stub(app.views.CallControlsView.prototype, "initialize");
      callControlsView = new app.views.CallControlsView({
        el: el
      });
    });

    describe("#_callOngoing", function() {
      it("should show the controls view", function() {
        callControlsView.$el.hide();

        callControlsView._callOngoing();

        expect(callControlsView.$el.is(":visible")).to.be.equal(true);
      });

      it("should hide the video button", function() {
        callControlsView.$el.find('.btn-video').show();

        callControlsView._callOngoing();

        expect(callControlsView.$el.find('.btn-video').is(":visible"))
          .to.be.equal(false);
      });

      it("should hide the audio button", function() {
        callControlsView.$el.find('.btn-audio').show();

        callControlsView._callOngoing();

        expect(callControlsView.$el.find('.btn-audio').is(":visible"))
          .to.be.equal(false);
      });

      it("should show the hangup button", function() {
        callControlsView.$(el).find('.btn-hangup').hide();

        callControlsView._callOngoing();

        expect(callControlsView.$el.find('.btn-hangup').is(":visible"))
          .to.be.equal(true);
      });
    });

    describe("#_callInactive", function() {
      it("should show the controls view", function() {
        callControlsView.$el.hide();

        callControlsView._callInactive();

        expect(callControlsView.$el.is(":visible")).to.be.equal(true);
      });

      it("should show the video button", function() {
        callControlsView.$el.find('.btn-video').hide();

        callControlsView._callInactive();

        expect(callControlsView.$el.find('.btn-video').is(":visible"))
          .to.be.equal(true);
      });

      it("should show the audio button", function() {
        callControlsView.$el.find('.btn-audio').hide();

        callControlsView._callInactive();

        expect(callControlsView.$el.find('.btn-audio').is(":visible"))
          .to.be.equal(true);
      });

      it("should hide the hangup button", function() {
        callControlsView.$(el).find('.btn-hangup').show();

        callControlsView._callInactive();

        expect(callControlsView.$el.find('.btn-hangup').is(":visible"))
          .to.be.equal(false);
      });
    });

    describe("#_callPending", function() {
      it("should hide the controls view", function() {
        callControlsView.$el.show();

        callControlsView._callPending();

        expect(callControlsView.$el.is(":visible")).to.be.equal(false);
      });
    });
  });

});
