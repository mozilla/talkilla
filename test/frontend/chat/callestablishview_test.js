/* global app, chai, describe, it, sinon, beforeEach, afterEach, $,
          WebRTC */

/* jshint expr:true */
var expect = chai.expect;

describe('Call Establish View', function() {
  "use strict";
  var media, sandbox, call, peer;

  beforeEach(function() {
    $('body').append([
      '<div id="establish">',
      '  <p class="avatar"><img src="" id="avatar"></p>',
      '  <p class="outgoing-info"><img src="/img/video-icon.png">',
      '    <span class="outgoing-text"></span></p>',
      '  <p class="actions"><a class="btn btn-abort">End Call</a></p>',
      '</div>'
    ].join(''));
    sandbox = sinon.sandbox.create();
    var media = sandbox.stub(new WebRTC());
    console.log(media);
    peer = new app.models.User();
    peer.set({nick: "Mark"});
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
      var establishView =
        new app.views.CallEstablishView({call: call, peer: peer});

      expect(establishView.call).to.equal(call);
    });

    it("should attach a given peer model", function() {
      var establishView =
        new app.views.CallEstablishView({call: call, peer: peer});

      expect(establishView.peer).to.equal(peer);
    });

    it("should throw an error when no peer is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView({call: call});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: peer/);
    });

    it("should throw an error when no call is given", function() {
      function shouldExplode() {
        new app.views.CallEstablishView({peer: peer});
      }
      expect(shouldExplode).to.Throw(Error, /missing parameter: call/);
    });
  });

  describe("#_handleStateChanges", function() {
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer
      });
    });

    it("should show the element when the state changes to pending from ready",
      function() {
        establishView.$el.hide();

        call.state.start();

        expect(establishView.$el.is(":visible")).to.be.equal(true);
      });

    it("should hide the element when the state changes from pending",
      function() {
        establishView.$el.show();

        call.state.start();
        call.state.hangup();

        expect(establishView.$el.is(":visible")).to.be.equal(false);
      });
  });

  describe("#_abort", function() {
    var establishView, event;

    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer
      });
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
    var establishView;
    beforeEach(function() {
      establishView = new app.views.CallEstablishView({
        call: call,
        peer: peer
      });
    });

    it("should show 'Calling Mark…' when rendering", function() {
      establishView.render();

      expect(establishView.$('.outgoing-text').text()).
        to.equal("Calling Mark…");
    });

    it("should render with the callee's avatar");
    // XXX: needs to have the Call model having its peer set as a User
    // model instance so we can actually get the avatar
  });

});
