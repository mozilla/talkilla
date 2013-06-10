/* global app, chai, describe, it, sinon, beforeEach, afterEach, $ */

/* jshint expr:true */
var expect = chai.expect;

describe('Call Offer View', function() {
  "use strict";
  var media, sandbox, call;

  beforeEach(function() {
    $('body').append([
      '<div id="offer">',
      '  <div id="controls">',
      '    <a class="btn btn-accept">Accept</a>',
      '  </div>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    media = new app.models.WebRTCCall();
    call = new app.models.Call({}, media);
  });

  afterEach(function() {
    $('#offer').remove();
    call = undefined;
    media = undefined;
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should attach a given call model", function() {
      var offerView = new app.views.CallOfferView({call: call});

      expect(offerView.call).to.equal(call);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.CallOfferView();
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });
  });

  describe("Change events", function() {
    var offerView;

    beforeEach(function() {
      sandbox.stub(call, "on");

      offerView = new app.views.CallOfferView({call: call});
    });

    it("should attach to change:state events on the call model", function() {
      sinon.assert.calledOnce(call.on);
      sinon.assert.calledWith(call.on, 'change:state');
    });

    it("should show the element when change:state goes to the incoming state",
      function() {
        call.on.args[0][1]("incoming");

        expect(offerView.$el.is(":visible")).to.be.equal(true);
      });

    it("should hide the element when change:state leaves the incoming state",
      function() {
        call.on.args[0][1]("terminated", "incoming");

        expect(offerView.$el.is(":visible")).to.be.equal(false);
      });
  });

  describe("#accept", function() {
    it("should tell the call model the call is accepted", function() {
      var offerView = new app.views.CallOfferView({call: call});
      call.accept = sandbox.stub();

      offerView.accept();

      sinon.assert.calledOnce(call.accept);
    });
  });
});
