/*global chai, app, sinon */
"use strict";

var expect = chai.expect;

describe("app.views", function() {
  var sandbox;

  describe("app.views.Notification", function() {
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("#clear", function() {
      it("should clear notification", function() {
        var view = new app.views.NotificationView({
          model: new app.models.Notification({type: "plip", message: "plop"})
        });
        sandbox.stub(view, "undelegateEvents");
        sandbox.stub(view, "remove");

        view.clear();

        sinon.assert.calledOnce(view.undelegateEvents);
        sinon.assert.calledOnce(view.remove);
      });
    });

    describe("#render", function() {
      it("should render itself", function() {
        var view = new app.views.NotificationView({
          model: new app.models.Notification({type: "plip", message: "plop"})
        });

        view.render();

        expect(view.$("div").attr("class")).eql("alert alert-plip");
        expect(view.$el.text()).to.match(/plop/);
      });
    });
  });
});
