/*global app, chai, sinon, WebRTC */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe('Call Offer View', function() {
  var sandbox, call;

  beforeEach(function() {
    $('body').append([
      '<div id="offer">',
      '  <p class="avatar"><img src="" id="avatar"></p>',
      '  <p class="actions"><a class="btn btn-accept">Accept</a></p>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    // XXX This should probably be a mock, but sinon mocks don't seem to want
    // to work with Backbone.
    call = new app.models.Call({}, {
      peer: new app.models.User({username: "jb"}),
      media: _.extend(new WebRTC(), {
        constraints: {},
        answer: sandbox.spy(),
        establish: sandbox.spy(),
        initiate: sandbox.spy(),
        terminate: sandbox.spy(),
        on: sandbox.stub()
      })
    });
  });

  afterEach(function() {
    $('#offer').remove();
    sandbox.restore();
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

  describe("#render", function() {
    it("should render with the caller's avatar");
    // XXX: needs to have the Call model having its peer set as a User
    // model instance so we can actually get the avatar
  });

});
