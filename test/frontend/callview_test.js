/* global app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("CallView", function() {
  var call;
  var callView;
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app, "trigger");
    sandbox.stub(app, "on");
    app.services.on = function() {};
  });

  afterEach(function() {
    sandbox.restore();
  });

    describe("#initialize", function() {

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

    it("should call hangup when the hangup button is triggered", function() {
        var el = $('<div><button class="btn-hangup"/></div>');
        call = new app.models.Call();
        callView = new app.views.CallView({call: call, el: el});
        sandbox.stub(callView, "hangup");
        console.log(callView.el);
        $(el).find('button').click();
        sinon.assert.calledOnce(callView.hangup);
    });
});
