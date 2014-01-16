/*global chai, app, sinon */
"use strict";

var expect = chai.expect;

describe("app.views", function() {
  var sandbox, view;

  describe("app.views.Notification", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      view = new app.views.NotificationView({
        model: new app.models.Notification({type: "plip", message: "plop"}),
        appStatus: new app.models.AppStatus()
      });
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("#clear", function() {
      it("should clear notification", function() {
        sandbox.stub(view, "undelegateEvents");
        sandbox.stub(view, "remove");

        view.clear();

        sinon.assert.calledOnce(view.undelegateEvents);
        sinon.assert.calledOnce(view.remove);
      });
    });

    describe("#render", function() {
      it("should render itself", function() {
        view.render();

        expect(view.$("div").attr("class")).eql("alert alert-plip");
        expect(view.$el.text()).to.match(/plop/);
      });
    });
  });
});
