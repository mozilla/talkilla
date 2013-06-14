/* global app, chai, describe, it, sinon, beforeEach, afterEach, $ */

/* jshint expr:true */
var expect = chai.expect;

describe('Call Establish View', function() {
  "use strict";
  var media, sandbox, call;

  beforeEach(function() {
    $('body').append([
      '<div id="establish">',
      '  <p class="avatar"><img src="" id="avatar"></p>',
      '  <p class="actions"><a class="btn btn-abort">End Call</a></p>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    // Although we're not testing it in this set of tests, stub the WebRTCCall
    // model's initialize function, as creating new media items
    // (e.g. PeerConnection) takes a lot of time that we don't need to spend.
    sandbox.stub(app.models.WebRTCCall.prototype, "initialize");
    media = new app.models.WebRTCCall();
    call = new app.models.Call({}, {media: media});
  });

  afterEach(function() {
    $('#establish').remove();
    call = undefined;
    media = undefined;
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should attach a given call model", function() {
      var establishView = new app.views.CallEstablishView({call: call});

      expect(establishView.call).to.equal(call);
    });

    it("should throw an error when no call model is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView();
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });

    it("should attach _handleStateChanges to the change:state event ",
      function() {
        sandbox.stub(call, "on");
        sandbox.stub(app.views.CallEstablishView.prototype,
          "_handleStateChanges");
        var establishView = new app.views.CallEstablishView({call: call});
        var attachedHandler = call.on.args[0][1];
        expect(establishView._handleStateChanges.callCount).to.equal(0);

        attachedHandler("to", "from");

        sinon.assert.calledOnce(establishView._handleStateChanges);
        sinon.assert.calledWithExactly(establishView._handleStateChanges,
          "to", "from");
      });

  });

  describe("#_handleStateChanges", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({call: call});
    });

    it("should show the element when the state changes to pending from ready",
      function() {
        establishView.$el.hide();

        establishView._handleStateChanges("pending", "ready");

        expect(establishView.$el.is(":visible")).to.be.equal(true);
      });

    it("should hide the element when the state changes from pending",
      function() {
        establishView.$el.show();

        establishView._handleStateChanges("dummy", "pending");

        expect(establishView.$el.is(":visible")).to.be.equal(false);
      });
  });

  describe("#_abort", function() {
    var establishView, event;

    beforeEach(function() {
      establishView = new app.views.CallEstablishView({call: call});
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
    it("should render with the caller's avatar");
    // XXX: needs to have the Call model having its otherUser set as a User
    // model instance so we can actually get the avatar
  });

});
