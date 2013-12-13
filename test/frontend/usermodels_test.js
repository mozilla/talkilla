/*global chai, app, sinon */
"use strict";

var expect = chai.expect;

describe("app.models", function() {
  describe("app.models.User", function() {

    it("should be initialized with a sensible defaults object", function() {
      var user = new app.models.User();
      expect(user.defaults).to.deep.equal({
        username: undefined,
        fullName: undefined,
        avatar: "img/default-avatar.png",
        presence: "disconnected"
      });
    });

    describe("#get", function() {
      var TestUser = app.models.User.extend({
        defaults: {foo: "bar"},
        bar: function() { return "baz"; }
      });

      it("should returns attribute value from a string", function() {
        expect(new TestUser().get("foo")).eql("bar");
      });

      it("should returns attribute value from a function", function() {
        expect(new TestUser().get("bar")).eql("baz");
      });
    });

    describe("#displayName", function() {
      it("should return the full name when data is available", function() {
        var user = new app.models.User({
          username: "mark",
          fullName: "Mark Banner"
        });
        expect(user.displayName()).eql("Mark Banner");
      });

      it("should return the username when full name is missing", function() {
        var user = new app.models.User({username: "mark"});
        expect(user.displayName()).eql("mark");
      });
    });

    describe("#isLoggedIn", function() {
      var user;
      beforeEach(function () {
        user = new app.models.User();
      });

      it("should be initialized as logged out", function() {
        expect(user.isLoggedIn()).to.equal(false);
      });

      it("should be logged out when the user username is specified, but the " +
         "user is disconnected", function() {
        user.set('username', 'nicolas');
        expect(user.isLoggedIn()).to.equal(false);
      });

      it("should be logged out when the presence is not disconnected, but " +
         "the user name is empty", function() {
        user.set('presence', 'connected');
        expect(user.isLoggedIn()).to.equal(false);
      });

      it("should be logged in when the presence is not disconnected and " +
         "the username is specified", function() {
        user.set('presence', 'connected');
        user.set('username', 'nicolas');
        expect(user.isLoggedIn()).to.equal(true);
      });
    });

    describe("#wasLoggedIn", function() {
      var user;

      beforeEach(function() {
        user = new app.models.User();
      });

      it("should be initialized as logged out", function() {
        expect(user.wasLoggedIn()).to.equal(false);
      });

      describe("already logged in", function() {
        beforeEach(function() {
          user.set('username', 'dan');
          user.set('presence', 'connected');
        });

        it("should remain as logged out when a user if first logged in",
          function() {
            expect(user.wasLoggedIn()).to.equal(false);
          });

        it("should change to logged in when a user is logged in and the " +
          "presence is changed", function() {
            user.set('presence', 'unavailable');

            expect(user.wasLoggedIn()).to.equal(true);
          });

        it("should change to logged in when the user is logged out",
          function() {
            user.set('username', undefined);

            expect(user.wasLoggedIn()).to.equal(true);
          });

        it("should change to logged in when the user is logged out (presence)",
          function() {
            user.set('presence', "disconnected");

            expect(user.wasLoggedIn()).to.equal(true);
          });
      });
    });

    describe("#initialize", function() {
      var sandbox, user;

      beforeEach(function() {
        sandbox = sinon.sandbox.create();
        sandbox.stub(app.models.User.prototype, "on");
        user = new app.models.User();
      });

      afterEach(function() {
        sandbox.restore();
      });

      it("should attach to the on change notification", function() {
        sinon.assert.calledOnce(user.on);
        sinon.assert.calledWith(user.on, "change");
      });

      it("should send a signin message when the user signs in", function() {
        // Set up the model as logged in
        user.set('username', 'dan');
        user.set('presence', 'connected');

        // Now we want to stub the trigger, to catch the call
        sandbox.stub(user, "trigger");

        // Trigger the on callback for handling the fact we've changed.
        user.on.args[0][1]();

        // Check we've been called correctly.
        sinon.assert.calledOnce(user.trigger);
        sinon.assert.calledWithExactly(user.trigger, "signin");
      });

      it("should send a signin message when the user signs in", function() {
        // Set up the model as logged out by first logging in, then out.
        user.set('username', 'dan');
        user.set('presence', 'connected');
        user.set('username', undefined);

        // Now we want to stub the trigger, to catch the call
        sandbox.stub(user, "trigger");

        // Trigger the on callback for handling the fact we've changed.
        user.on.args[0][1]();

        // Check we've been called correctly.
        sinon.assert.calledOnce(user.trigger);
        sinon.assert.calledWithExactly(user.trigger, "signout");
      });
    });
  });

});
