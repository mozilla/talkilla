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
      var el, callView, localElement, remoteElement;

      beforeEach(function() {
        call.media = _.extend({}, Backbone.Events);

        el = $('<div><div id="local-video"></div><div id="remote-video">' +
               '</div></div>');
        $("#fixtures").append(el);
        callView = new app.views.CallView({el: el, call: call});

        localElement = el.find('#local-video')[0];
        localElement.play = sandbox.spy();

        remoteElement = el.find('#remote-video')[0];
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
});
