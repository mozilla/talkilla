/* global app, chai, describe, it, sinon, beforeEach, afterEach, $ */

/* jshint expr:true */
var expect = chai.expect;

describe("CallView", function() {
  "use strict";

  var fakeLocalStream = "fakeLocalStream";
  var fakeRemoteStream = "fakeRemoteStream";
  var el = 'fakeDom';
  var sandbox, media, call;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    media = new app.models.WebRTCCall();
    call = new app.models.Call({}, {media: media});
  });

  afterEach(function() {
    sandbox.restore();
    media = null;
    call = null;
    $("#fixtures").empty();
  });

  describe("#initialize", function() {

    it("should attach a given call model", function() {
      var callView = new app.views.CallView({el: el, call: call});

      expect(callView.call).to.equal(call);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.CallView({el: 'fakeDom'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should throw an error when no el parameter is given", function() {
      function shouldExplode() {
        new app.views.CallView({call: 'fakeWebrtc'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: el/);
    });

    describe("Change events", function() {
      var callView;

      beforeEach(function() {
        sandbox.stub(call, "on");

        sandbox.stub(app.views.CallView.prototype, "ongoing");
        sandbox.stub(app.views.CallView.prototype, "terminated");
        callView = new app.views.CallView({el: $("#call"), call: call});
      });

      it("should attach to state:to:... events on the call model", function() {
        sinon.assert.calledTwice(call.on);
        sinon.assert.calledWith(call.on, 'state:to:ongoing');
        sinon.assert.calledWith(call.on, 'state:to:terminated');
      });

    });

    it("should call #_displayLocalVideo when the webrtc model sets localStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayLocalVideo");
        var callView = new app.views.CallView({el: el, call: call});

        call.media.set("localStream", fakeLocalStream);

        sinon.assert.calledOnce(callView._displayLocalVideo);
      });

    it("should call #_displayRemoteVideo when webrtc model sets remoteStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayRemoteVideo");
        var callView = new app.views.CallView({el: el, call: call});

        call.media.set("remoteStream", fakeRemoteStream);

        sinon.assert.calledOnce(callView._displayRemoteVideo);
      });

  });

  describe("#ongoing", function() {
    it("should show this widget", function() {
      var el = $('<div><div id="foo"></div></div>');
      $("#fixtures").append(el);
      var callView = new app.views.CallView({el: el, call: call});

      callView.ongoing();

      expect(callView.$el.is(':visible')).to.equal(true);
    });
  });

  describe("#terminated", function() {
    it("should hide this widget", function() {
      var el = $('<div><div id="foo"></div></div>');
      $("#fixtures").append(el);
      var callView = new app.views.CallView({el: el, call: call});

      callView.terminated();

      expect(callView.$el.is(':visible')).to.equal(false);
    });
  });

  describe("#_displayLocalVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, call: call});
      call.media.set("localStream", fakeLocalStream, {silent: true});

      videoElement = el.find('#local-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the local stream to the local-video element",
      function() {
        callView._displayLocalVideo();

        expect(videoElement.mozSrcObject).to.equal(fakeLocalStream);
      });

    it("should call play on the local-video element",
      function() {
        callView._displayLocalVideo();

        sinon.assert.calledOnce(videoElement.play);
      });
  });

  describe("#_displayRemoteVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="remote-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, call: call});
      call.media.set("remoteStream", fakeRemoteStream, {silent: true});

      videoElement = el.find('#remote-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the remote stream to the 'remove-video' element",
      function() {
        callView._displayRemoteVideo();

        expect(el.find('#remote-video')[0].mozSrcObject).
          to.equal(fakeRemoteStream);
      });

    it("should play the remote videoStream",
      function() {
        callView._displayRemoteVideo();

        sinon.assert.calledOnce(videoElement.play);
      });

  });
});
