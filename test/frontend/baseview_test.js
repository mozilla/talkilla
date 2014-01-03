/*global chai, app*/
"use strict";

var expect = chai.expect;

describe("app.views.BaseView", function() {
  describe("#constructor", function() {
    var TestView;

    function createTestView(options) {
      return function() {
        return new TestView(options);
      };
    }

    beforeEach(function() {
      TestView = app.views.BaseView.extend({});
    });

    it("should check for a single required dependency when no option passed",
      function() {
        TestView.prototype.dependencies = {user: app.models.User};

        expect(createTestView()).to.Throw(TypeError, /missing required user/);
      });

    it("should check for a single required dependency", function() {
      TestView.prototype.dependencies = {user: app.models.User};

      expect(createTestView({})).to.Throw(TypeError, /missing required user/);

      expect(createTestView({user: undefined})).to.Throw(
        TypeError, /missing required user/);

      expect(createTestView({user: null})).to.Throw(
        TypeError, /missing required user/);
    });

    it("should check for multiple required dependencies", function() {
      TestView.prototype.dependencies = {user:  app.models.User,
                                         users: app.models.SPA};

      expect(createTestView({})).to.Throw(TypeError,
                                          /missing required user, users/);
    });

    it("should check for required dependency types", function() {
      TestView.prototype.dependencies = {user:  app.models.User};

      expect(createTestView({user: "woops"})).to.Throw(
        TypeError, /invalid dependency: user/);
    });

    it("should check for a dependency to match at least one of passed types",
      function() {
        TestView.prototype.dependencies = {
          user:  [app.models.User, app.models.CurrentUser]
        };

        expect(createTestView({user: "woops"})).to.Throw(
          TypeError, /invalid dependency: user/);

        expect(new TestView({user: new app.models.User()}).user)
               .to.be.instanceOf(app.models.User);

        expect(new TestView({user: new app.models.CurrentUser()}).user)
               .to.be.instanceOf(app.models.CurrentUser);
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

    it("shouldn't attach properties if they're not declared as dependencies",
      function() {
        TestView.prototype.dependencies = {};

        expect(new TestView({foo: 42}).foo).to.be.a("undefined");
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

    it("should skip type check if required dependency type is undefined",
      function() {
        TestView.prototype.dependencies = {user: undefined};

        expect(createTestView({user: /whatever/})).not.to.Throw();
      });

    it("should check for a String dependency", function() {
      TestView.prototype.dependencies = {foo: String};

      expect(createTestView({foo: 42})).to.Throw(
        TypeError, /invalid dependency: foo/);
      expect(new TestView({foo: "x"}).foo).eql("x");
    });

    it("should check for a Number dependency", function() {
      TestView.prototype.dependencies = {foo: Number};

      expect(createTestView({foo: "x"})).to.Throw(
        TypeError, /invalid dependency: foo/);
      expect(new TestView({foo: 42}).foo).eql(42);
    });

    it("should check for a RegExp dependency", function() {
      TestView.prototype.dependencies = {foo: RegExp};

      expect(createTestView({foo: "x"})).to.Throw(
        TypeError, /invalid dependency: foo/);
      expect(new TestView({foo: /x/}).foo).eql(/x/);
    });

    it("should check for a custom constructor dependency", function() {
      function Foo(){}
      Foo.prototype = {};
      TestView.prototype.dependencies = {foo: Foo};

      expect(createTestView({foo: "x"})).to.Throw(
        TypeError, /invalid dependency: foo/);
      var foo = new Foo();
      expect(new TestView({foo: foo}).foo).eql(foo);
    });
  });
});
