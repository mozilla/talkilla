/* global $, app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("CallView", function() {
  var callView;
  var sandbox;

  describe("#initialize", function() {

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      sandbox.stub(app, "trigger");
      sandbox.stub(app, "on");
      sandbox.stub(app.services, "on");
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should attach a given call model to the view", function() {
      var callModel = sandbox.spy();

      callView = new app.views.CallView({model: callModel});
      expect(callView.model).to.equal(callModel);
    });

    it("should raise an error if we don't pass a call model", function() {
      function init() {
        new app.views.CallView();
      }
      expect(init).to.Throw(Error);
    });

  });

  describe("events", function() {

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    it("should call hangup() when a click event is fired on the hangup button",
      function() {
        var el = $('<div><button class="btn-hangup"/></div>');
        $("#fixtures").append(el);
        sandbox.stub(app.views.CallView.prototype, "initialize");
        sandbox.stub(app.views.CallView.prototype, "hangup");
        callView = new app.views.CallView({el: el});

        $(el).find('button').click();
        sinon.assert.calledOnce(callView.hangup);

        $("#fixtures").empty();
      });
  });

  describe("#hangup", function() {
    it('should trigger a hangup event on the model');
  });

});
