/*global app, chai, sinon  */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("CallView", function() {
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
                '  <div id="local-media"></div>',
                '  <div id="remote-media"></div>',
                '</div>'].join(''));
        $("#fixtures").append(el);
        callView = new app.views.CallView({el: el, call: call});

        $localElement = el.find('#local-media');
        localElement = $localElement.get(0);
        localElement.play = sandbox.spy();

        remoteElement = el.find('#remote-media').get(0);
        remoteElement.play = sandbox.spy();
      });

      describe("local-stream:ready", function() {
        it("should attach the local stream to the local-media element",
          function() {
            call.media.trigger("local-stream:ready", fakeLocalStream);

            expect(localElement.mozSrcObject).to.equal(fakeLocalStream);
          });

        it("should call play on the local-media element",
          function() {
            call.media.trigger("local-stream:ready", fakeLocalStream);

            sinon.assert.calledOnce(localElement.play);
          });
      });

      describe("local-stream:terminated", function() {
        it("should detach the local stream from the local-media element",
          function() {
            localElement.mozSrcObject = fakeLocalStream;

            call.media.trigger("local-stream:terminated");

            expect(localElement.mozSrcObject).to.equal(undefined);
          });
      });

      describe("remote-stream:ready", function() {
        it("should attach the remote stream to the 'remote-media' element",
          function() {
            call.media.trigger("remote-stream:ready", fakeRemoteStream);

            expect(remoteElement.mozSrcObject).
              to.equal(fakeRemoteStream);
          });

        it("should play the remote media stream",
          function() {
            call.media.trigger("remote-stream:ready", fakeRemoteStream);

            sinon.assert.calledOnce(remoteElement.play);
          });
      });

      describe("remote-stream:terminated", function() {
        it("should detach the remote stream from the remote-media element",
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
      el = $(['<div id="call" style="display: table-row;">',
              '  <div class="media-display-area">',
              '    fake text for :visible',
              '  </div>',
              '</div>'].join(''));
      $("#fixtures").append(el);

      callView = new app.views.CallView({el: $("#fixtures #call"), call: call});
    });

    it("should show the media-display-view when a call is ongoing and " +
      "contains video",
      function() {
        $("#fixtures .media-display-area").css("display", "none");
        sandbox.stub(call, "requiresVideo").returns(true);
        call.state.current = "ongoing";

        callView.render();

        expect(callView.$el.find(".media-display-area").is(':visible'))
          .to.equal(true);
      });

    it("should hide the media-display-view when a call is ongoing and " +
      "has no video",
      function() {
        $("#fixtures .media-display-area").css("display", "block");
        sandbox.stub(call, "requiresVideo").returns(false);
        call.state.current = "ongoing";

        callView.render();

        expect(callView.$el.find(".media-display-area").is(':visible'))
          .to.equal(false);
      });

    it("should hide the media-display-view when a call isn't ongoing and " +
      "has video",
      function() {
        $("#fixtures .media-display-area").css("display", "block");
        sandbox.stub(call, "requiresVideo").returns(true);

        var states = ["pending", "incoming", "terminated", "timeout"];
        states.forEach(function(state) {

          call.state.current = state;

          callView.render();

          expect(callView.$el.find(".media-display-area").is(':visible'))
            .to.equal(false);

        });
      });


  });
});
