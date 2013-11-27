/*global chai, app, sinon */
"use strict";

var expect = chai.expect;

describe("app.models", function() {
  describe("app.models.User", function() {

    it("should be initialized with a sensible defaults object", function() {
      var user = new app.models.User();
      expect(user.defaults).to.deep.equal({
        nick: undefined,
        avatar: "img/default-avatar.png",
        presence: "disconnected"
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

      it("should be logged out when the user nick is specified, but the user" +
         "is disconnected", function() {
        user.set('nick', 'nicolas');
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
        user.set('nick', 'nicolas');
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
          user.set('nick', 'dan');
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
            user.set('nick', undefined);

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
        user.set('nick', 'dan');
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
        user.set('nick', 'dan');
        user.set('presence', 'connected');
        user.set('nick', undefined);

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
