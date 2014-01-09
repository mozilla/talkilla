/*global chai, app*/
"use strict";

var expect = chai.expect;

describe("app.views.BaseView", function() {
  describe("#constructor", function() {
    var TestView;

    beforeEach(function() {
      TestView = app.views.BaseView.extend({});
    });

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
});
