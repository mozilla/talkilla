/* global Backbone, _, app, chai, describe, it, sinon, beforeEach, afterEach,
   $ */

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
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    media = {
      answer: sandbox.stub(),
      establish: sandbox.stub(),
      initiate: sandbox.stub(),
      terminate: sandbox.stub(),
      on: sandbox.stub()
    };
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

    describe("media streams", function() {
      beforeEach(function() {
        call.media = _.extend({}, Backbone.Events);
      });

      it("should call #_displayLocalVideo when local media stream is ready",
        function() {
          sandbox.stub(app.views.CallView.prototype, "_displayLocalVideo");
          var callView = new app.views.CallView({el: el, call: call});
          call.media.trigger("local-stream:ready", {local: true});

          sinon.assert.calledOnce(callView._displayLocalVideo);
          sinon.assert.calledWithExactly(callView._displayLocalVideo,
                                         {local: true});
        });

      it("should call #_displayRemoteVideo when remote media stream is ready",
        function() {
          sandbox.stub(app.views.CallView.prototype, "_displayRemoteVideo");
          var callView = new app.views.CallView({el: el, call: call});
          call.media.trigger("remote-stream:ready", {remote: true});

          sinon.assert.calledOnce(callView._displayRemoteVideo);
          sinon.assert.calledWithExactly(callView._displayRemoteVideo,
                                         {remote: true});
        });
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

      videoElement = el.find('#local-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the local stream to the local-video element",
      function() {
        callView._displayLocalVideo(fakeLocalStream);

        expect(videoElement.mozSrcObject).to.equal(fakeLocalStream);
      });

    it("should call play on the local-video element",
      function() {
        callView._displayLocalVideo(fakeLocalStream);

        sinon.assert.calledOnce(videoElement.play);
      });
  });

  describe("#_displayRemoteVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="remote-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, call: call});

      videoElement = el.find('#remote-video')[0];
      videoElement.play = sandbox.spy();
    });

    it("should attach the remote stream to the 'remove-video' element",
      function() {
        callView._displayRemoteVideo(fakeRemoteStream);

        expect(el.find('#remote-video')[0].mozSrcObject).
          to.equal(fakeRemoteStream);
      });

    it("should play the remote videoStream",
      function() {
        callView._displayRemoteVideo(fakeRemoteStream);

        sinon.assert.calledOnce(videoElement.play);
      });

  });
});
