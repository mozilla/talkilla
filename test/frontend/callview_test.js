/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("CallView", function() {
  var call;
  var callView;
  var sandbox;


  describe("#initialize", function() {

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(app, "trigger");
      sandbox.stub(app, "on");
      app.services.on = function() {};
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should attach a given call model to the view", function() {
      call = new app.models.Call();
      callView = new app.views.CallView({call: call});
      expect(callView.call).to.be.an.instanceOf(app.models.Call);
    });

    it("should raise an error if we do give a call model", function() {
      function init() {
        new app.views.CallView();
      }
      expect(init).to.Throw();
    });

  });

  describe("events", function() {

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should call hangup when the click event is fired on the hangup button",
      function() {

        var el = $('<div><button class="btn-hangup"/></div>');
        $("#fixtures").append(el);
        call = new app.models.Call();
        sandbox.stub(app.views.CallView.prototype, "initialize");
        sandbox.stub(app.views.CallView.prototype, "hangup");
        callView = new app.views.CallView({call: call, el: el});

        console.log(callView.el); // XXX

        $(el).find('button').click();

        sinon.assert.calledOnce(callView.hangup);

        $(el).empty();

      });
  });

});
