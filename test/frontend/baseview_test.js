/*global chai, app, sinon*/
"use strict";

var expect = chai.expect;

describe("app.views.BaseView", function() {
  var sandbox, TestView;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    TestView = app.views.BaseView.extend({});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#constructor", function() {
    it("should set required dependencies as view properties", function() {
      TestView.prototype.dependencies = {user: app.models.User,
                                         spa:  app.models.SPA};
      var user = new app.models.User({nick: "niko"});
      var spa = new app.models.SPA();

      var view = new TestView({user: user, spa: spa});

      expect(view.user).eql(user);
      expect(view.spa).eql(spa);
    });

    it("should have performed checks and sets on initialisation",
      function(done) {
        TestView.prototype.dependencies = {user: app.models.User,
                                           spa: app.models.SPA};
        var user = new app.models.User({nick: "niko"});
        var spa = new app.models.SPA();

        TestView.prototype.initialize = function() {
          expect(this.user).eql(user);
          expect(this.spa).eql(spa);
          done();
        };

        new TestView({user: user, spa: spa});
      });
  });

  describe("visibility", function() {
    var view;

    beforeEach(function() {
      view = new TestView();

      sandbox.stub(view.$el, "hide");
      sandbox.stub(view.$el, "show");
    });

    describe("#hide", function() {
      it("should hide the view", function() {
        view.hide();

        sinon.assert.calledOnce(view.$el.hide);
      });
    });

    describe("#show", function() {
      it("should show the view", function() {
        view.show();

        sinon.assert.calledOnce(view.$el.show);
      });
    });
  });

});
