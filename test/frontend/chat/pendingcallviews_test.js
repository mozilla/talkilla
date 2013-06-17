/* global app, chai, describe, it, sinon, beforeEach, afterEach, $ */

/* jshint expr:true */
var expect = chai.expect;

describe('Pending Call Views', function() {
  "use strict";
  var media, sandbox, call;

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
    call = undefined;
    media = undefined;
    sandbox.restore();
  });

  describe("BasePendingCallView", function () {

    describe("#initialize", function() {
      it("should attach a given call model", function() {
        var baseView = new app.views.BasePendingCallView({call: call});

        expect(baseView.call).to.equal(call);
      });

      it("should throw an error when no call model is given", function() {
        function shouldExplode() {
          new app.views.BasePendingCallView();
        }
        expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
      });

    });

    describe("#render", function() {
      it("should return the view as a convenience", function() {
        var baseView = new app.views.BasePendingCallView({call: call});

        var retVal = baseView.render();
        expect(retVal).to.equal(baseView);
      });

      it("should render with the caller's avatar");
      // XXX: needs to have the Call model having its otherUser set as a User
      // model instance so we can actually get the avatar
    });
  });

  describe('Call Offer View', function() {
    beforeEach(function() {
      $('body').append([
        '<div id="offer">',
        '  <p class="avatar"><img src="" id="avatar"></p>',
        '  <p class="actions"><a class="btn btn-accept">Accept</a></p>',
        '</div>'
      ].join(''));
    });

    afterEach(function() {
      $('#offer').remove();
    });

    describe("#initialize", function() {
      it('should call the base class initiailize function correctly',
        function () {
          sandbox.stub(app.views.BasePendingCallView.prototype, "initialize");
          var options = {call: call};
          new app.views.CallOfferView(options);

          sinon.assert.calledOnce(
            app.views.BasePendingCallView.prototype.initialize);
          sinon.assert.calledWithExactly(
            app.views.BasePendingCallView.prototype.initialize, options);
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

  describe('Call Establish View', function() {

    beforeEach(function() {
      $('body').append([
        '<div id="establish">',
        '  <p class="avatar"><img src="" id="avatar"></p>',
        '  <p class="actions"><a class="btn btn-abort">End Call</a></p>',
        '</div>'
      ].join(''));
    });

    afterEach(function() {
      $('#establish').remove();
    });

    describe("#initialize", function() {
      it('should call the base class initiailize function correctly',
        function () {
          sandbox.stub(app.views.BasePendingCallView.prototype, "initialize");
          var options = {call: call};
          new app.views.CallEstablishView(options);

          sinon.assert.calledOnce(
            app.views.BasePendingCallView.prototype.initialize);
          sinon.assert.calledWithExactly(
            app.views.BasePendingCallView.prototype.initialize, options);
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

  });
});
