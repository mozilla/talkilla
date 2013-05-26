/* global chai, describe, it, app */
var expect = chai.expect;

describe("app.models", function() {
  "use strict";

  describe("app.models.User", function() {

    it("should be initialized with a sensible defaults object", function() {
      var user = new app.models.User();
      expect(user.defaults).to.deep.equal({
        nick: undefined,
        presence: "disconnected"
      });
    });

    it("should be initialized as logged out", function() {
      var user = new app.models.User();
      expect(user.isLoggedIn()).to.equal(false);
    });

    it("should be logged out when the user nick is specified, but the user" +
       "is disconnected", function() {
      var user = new app.models.User();
      user.set('nick', 'nicolas');
      expect(user.isLoggedIn()).to.equal(false);
    });

    it("should be logged out when the presence is not disconnected, but the " +
       "user name is empty", function() {
      var user = new app.models.User();
      user.set('presence', 'connected');
      expect(user.isLoggedIn()).to.equal(false);
    });

    it("should be logged in when the presence is not disconnected and " +
       "the username is specified", function() {
      var user = new app.models.User();
      user.set('presence', 'connected');
      user.set('nick', 'nicolas');
      expect(user.isLoggedIn()).to.equal(true);
    });

  });

  describe("app.models.UserSet", function() {

    it("should be empty upon creation", function() {
      var userSet = new app.models.UserSet();
      expect(userSet.length).to.equal(0);
    });

    it("should update the user collection on `talkilla.users` service events",
      function() {
        var userSet = new app.models.UserSet();

        app.services.trigger("talkilla.users", [{nick: "bob"}]);
        expect(userSet).have.length.of(1);
        expect(userSet.at(0).get('nick')).to.equal("bob");

        app.services.trigger("talkilla.users", [{nick: "bob"}, {nick: "bill"}]);
        expect(userSet).have.length.of(2);
        expect(userSet.at(0).get('nick')).to.equal("bob");
        expect(userSet.at(1).get('nick')).to.equal("bill");

        app.services.trigger("talkilla.users", []);
        expect(userSet).have.length.of(0);
      });
  });

});
