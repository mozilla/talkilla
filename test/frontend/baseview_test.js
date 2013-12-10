/*global chai, app*/
"use strict";

var expect = chai.expect;

describe("app.views", function() {
  describe("app.views.BaseView", function() {
    describe("#checkOptions", function() {
      var view;

      beforeEach(function() {
        view = new app.views.BaseView();
      });

      it("should throw a ViewOptionError when option is missing", function() {
        expect(function() {
          view.checkOptions({}, "foo");
        }).to.Throw(app.views.ViewOptionError, /foo/);
      });

      it("should throw a ViewOptionError when options are missing", function() {
        expect(function() {
          view.checkOptions({}, "foo", "bar", "baz");
        }).to.Throw(app.views.ViewOptionError, /foo, bar, baz/);
      });

      it("shouldn't throw when a required option is present", function() {
        expect(function() {
          view.checkOptions({foo: 42}, "foo");
        }).not.to.Throw();
      });

      it("shouldn't throw when required options are present", function() {
        expect(function() {
          view.checkOptions({foo: 42, bar: 1337}, "foo", "bar");
        }).not.to.Throw();
      });
    });
  });
});
