/*global app, chai, sinon  */

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
      answer: sandbox.spy(),
      establish: sandbox.spy(),
      initiate: sandbox.spy(),
      terminate: sandbox.spy(),
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

    it("should attach the #_onWindowResize handler to the window", function() {

      sandbox.stub(window, "addEventListener");

      var callView = new app.views.CallView({el: el, call: call});

      sinon.assert.calledOnce(window.addEventListener);
      sinon.assert.calledWithExactly(window.addEventListener, "resize",
        callView._onWindowResize);
    });

    describe("Change events", function() {
      var callView;

      beforeEach(function() {
        sandbox.stub(call, "on");

        sandbox.stub(app.views.CallView.prototype, "render");
        callView = new app.views.CallView({el: $("#call"), call: call});
      });

      it("should attach to state:to:... events on the call model", function() {
        sinon.assert.calledOnce(call.on);
        sinon.assert.calledWith(call.on, 'change:state');
      });

    });

    describe("media streams", function() {
      var el, callView, $localElement, localElement, remoteElement;

      beforeEach(function() {
        call.media = _.extend({}, Backbone.Events);

        el = $(['<div>',
                '  <div id="local-video"></div>',
                '  <div id="remote-video"></div>',
                '</div>'].join(''));
        $("#fixtures").append(el);
        callView = new app.views.CallView({el: el, call: call});

        $localElement = el.find('#local-video');
        localElement = $localElement.get(0);
        localElement.play = sandbox.spy();

        remoteElement = el.find('#remote-video').get(0);
        remoteElement.play = sandbox.spy();
      });

      describe("local-stream:ready", function() {
        it("should attach the local stream to the local-video element",
          function() {
            call.media.trigger("local-stream:ready", fakeLocalStream);

            expect(localElement.mozSrcObject).to.equal(fakeLocalStream);
          });

        it("should call play on the local-video element",
          function() {
            call.media.trigger("local-stream:ready", fakeLocalStream);

            sinon.assert.calledOnce(localElement.play);
          });

        it("should show the local-video element for video calls", function() {
          sandbox.stub(jQuery.prototype, "show");
          sandbox.stub(call, "requiresVideo").returns(true);
          localElement.play = function() {
            localElement.onplaying();
          };

          call.media.trigger("local-stream:ready", fakeLocalStream);

          sinon.assert.calledOnce($localElement.show);
        });

        it("should not show the local-video element for audio calls",
          function() {
            sandbox.stub(jQuery.prototype, "show");
            sandbox.stub(call, "requiresVideo").returns(false);
            localElement.play = function() {
              localElement.onplaying();
            };

            call.media.trigger("local-stream:ready", fakeLocalStream);

            sinon.assert.notCalled($localElement.show);
          });
      });

      describe("local-stream:terminated", function() {
        it("should detach the local stream from the local-video element",
          function() {
            localElement.mozSrcObject = fakeLocalStream;

            call.media.trigger("local-stream:terminated");

            expect(localElement.mozSrcObject).to.equal(undefined);
          });
      });

      describe("remote-stream:ready", function() {
        it("should attach the remote stream to the 'remote-video' element",
          function() {
            call.media.trigger("remote-stream:ready", fakeRemoteStream);

            expect(remoteElement.mozSrcObject).
              to.equal(fakeRemoteStream);
          });

        it("should play the remote videoStream",
          function() {
            call.media.trigger("remote-stream:ready", fakeRemoteStream);

            sinon.assert.calledOnce(remoteElement.play);
          });
      });

      describe("remote-stream:terminated", function() {
        it("should detach the remote stream from the remote-video element",
          function() {
            remoteElement.mozSrcObject = fakeRemoteStream;

            call.media.trigger("remote-stream:terminated");

            expect(remoteElement.mozSrcObject).to.equal(undefined);
          });
      });
    });
  });

  describe("#render", function() {
    var callView;

    beforeEach(function() {
      $("#fixtures").append($('<div id="call"><div id="foo"></div></div>'));
      callView = new app.views.CallView({el: $("#fixtures #call"), call: call});
    });

    it("should show this widget when a call is ongoing", function() {
      call.state.current = "ongoing";

      callView.render();

      expect(callView.$el.is(':visible')).to.equal(true);
    });

    it("should hide this widget when a call isn't ongoing", function() {
      var states = ["pending", "incoming", "terminated", "timeout"];
      states.forEach(function(state) {
        call.state.current = state;

        callView.render();

        expect(callView.$el.is(':visible')).to.equal(false);
      });
    });
  });

  // Sure would be nice to test this using synthetic events, but those don't
  // seem to work well enough just yet.  Oh well, one of these years!
  describe("#_onWindowResize", function() {

    var el, callView, localElement, fakeEvent, remoteElement,
      fakePillarboxWidth;

    beforeEach(function() {
      el = $(['<div>',
        '  <div id="local-video" width="20" height="20"></div>',
        '  <div id="remote-video" width="320" height="200"></div>',
        '</div>'].join(''));
      $("#fixtures").append(el);
      var $remoteElement = el.find('#remote-video');
      remoteElement = $remoteElement.get(0);
      remoteElement.videoHeight = 300;
      remoteElement.videoWidth = 180;

      callView = new app.views.CallView({el: el, call: call});

      fakeEvent = {};

      fakePillarboxWidth = 40;
      sandbox.stub(app.utils, "getPillarboxWidth").returns(fakePillarboxWidth);
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    it("should get the pillarbox width of the remoteVideo element",
      function() {
        callView._onWindowResize(fakeEvent);

        sinon.assert.calledOnce(app.utils.getPillarboxWidth);
        sinon.assert.calledWith(app.utils.getPillarboxWidth, sinon.match.array,
          sinon.match.array);
      });

    it("should set the CSS |right| property on the localVideo element to" +
      " pillarboxWidth + gutterWidth",
      function() {
        var $localElement = el.find('#local-video');
        localElement = $localElement.get(0);
        localElement.style.right = "";

        callView._onWindowResize(fakeEvent);

        expect(localElement.style.right).to.
          equal(fakePillarboxWidth + callView._localVideoGutterWidth + "px");
      });

    // there's no meaningful thing to resize in this case, and making the call
    // would violate the getPillarboxWidth API and cause an exception
    it("should not call getPillarboxWidth if the remote stream's height" +
      " or width is 0",
      function() {
        remoteElement.videoHeight = 0;

        callView._onWindowResize(fakeEvent);

        sinon.assert.notCalled(app.utils.getPillarboxWidth);
      });
  });

});
