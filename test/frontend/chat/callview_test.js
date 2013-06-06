/* global app, chai, describe, it, sinon, beforeEach, afterEach,
   ChatApp, mozRTCSessionDescription, $, _, Backbone, mozRTCPeerConnection */

/* jshint expr:true */
var expect = chai.expect;

describe("CallView", function() {
  "use strict";

  var fakeLocalStream = "fakeLocalStream";
  var fakeRemoteStream = "fakeRemoteStream";
  var el = 'fakeDom';
  var sandbox, webrtc;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    webrtc = new app.models.WebRTCCall();
  });

  afterEach(function() {
    sandbox.restore();
    webrtc = null;
    $("#fixtures").empty();
  });

  describe("#initialize", function() {

    it("should attach a given webrtc model", function() {
      var callView = new app.views.CallView({el: el, webrtc: webrtc});

      expect(callView.webrtc).to.equal(webrtc);
    });

    it("should throw an error when no webrtc model is given", function() {
      function shouldExplode() {
        new app.views.CallView({el: 'fakeDom'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: webrtc/);
    });

    it("should throw an error when no el parameter is given", function() {
      function shouldExplode() {
        new app.views.CallView({webrtc: 'fakeWebrtc'});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: el/);
    });

    it("should call #_displayLocalVideo when the webrtc model sets localStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayLocalVideo");
        var callView = new app.views.CallView({el: el, webrtc: webrtc});

        webrtc.set("localStream", fakeLocalStream);

        sinon.assert.calledOnce(callView._displayLocalVideo);
      });

    it("should call #_displayRemoteVideo when webrtc model sets remoteStream",
      function () {
        sandbox.stub(app.views.CallView.prototype, "_displayRemoteVideo");
        var callView = new app.views.CallView({el: el, webrtc: webrtc});

        webrtc.set("remoteStream", fakeRemoteStream);

        sinon.assert.calledOnce(callView._displayRemoteVideo);
      });
  });

  describe("events", function() {
    it("should call hangup() when a click event is fired on the hangup button",
      function() {
        var el = $('<div><button class="btn-hangup"/></div>');
        $("#fixtures").append(el);
        sandbox.stub(app.views.CallView.prototype, "initialize");
        sandbox.stub(app.views.CallView.prototype, "hangup");
        var callView = new app.views.CallView({el: el});

        $(el).find('button').click();
        sinon.assert.calledOnce(callView.hangup);

        $("#fixtures").empty();
      });
  });

  describe("#hangup", function() {

    it('should close the window', function() {
      var el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);
      var callView = new app.views.CallView({el: el, webrtc: webrtc});
      sandbox.stub(window, "close");

      callView.hangup();

      sinon.assert.calledOnce(window.close);
    });
  });

  describe("#_displayLocalVideo", function() {
    var el, callView, videoElement;

    beforeEach(function() {
      el = $('<div><div id="local-video"></div></div>');
      $("#fixtures").append(el);
      callView = new app.views.CallView({el: el, webrtc: webrtc});
      webrtc.set("localStream", fakeLocalStream, {silent: true});

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
      callView = new app.views.CallView({el: el, webrtc: webrtc});
      webrtc.set("remoteStream", fakeRemoteStream, {silent: true});

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
