/*global app, chai */
"use strict";

var expect = chai.expect;

describe("UserSet Collection", function() {
  var jb, chuck, collection;

  beforeEach(function() {
    jb = new app.models.User({
      username: "jb",
      fullName: "JB",
      email: "jb@pirates.org",
      phoneNumber: "123",
      presence: "connected",
      isContact: true
    });
    chuck = new app.models.User({
      username: "chuck",
      fullName: "Chuck Norris",
      email: "chuck@norr.is",
      phoneNumber: "666",
      presence: "connected"
    });
    collection = new app.models.UserSet([jb, chuck]);
  });

  describe("#comparator", function() {
    it("should order by lowercased full name by default", function() {
      expect(collection.at(0).get('fullName')).to.equal('Chuck Norris');
      expect(collection.at(1).get('fullName')).to.equal('JB');
    });
  });

  describe("#excludeUser()", function() {
    it("should exclude a given user by its id from the collection", function() {
      expect(collection.excludeUser("chuck")).to.have.length.of(1);
    });

    it("shouldn't exclude when no user id is passed", function() {
      expect(collection.excludeUser(undefined)).to.have.length.of(2);
    });
  });

  describe("#findUser", function() {
    it("should find users from their username", function() {
      expect(collection.findUser("jb")).eql(jb);
      expect(collection.findUser("chuck")).eql(chuck);
    });

    it("should find users from their email", function() {
      expect(collection.findUser("jb@pirates.org")).eql(jb);
      expect(collection.findUser("chuck@norr.is")).eql(chuck);
    });

    it("should find users from their phone number", function() {
      expect(collection.findUser("123")).eql(jb);
      expect(collection.findUser("666")).eql(chuck);
    });
  });

  describe("#setUserPresence", function() {
    it("should set the user presence to a given status", function() {
      collection.setUserPresence("123", "disconnected");

      expect(jb.get("presence")).eql("disconnected");
      expect(chuck.get("presence")).eql("connected");
    });
  });

  describe("#setGlobalPresence", function() {
    it("should update the presence for all users", function() {
      collection.setGlobalPresence("disconnected");

      expect(jb.get("presence")).eql("disconnected");
      expect(chuck.get("presence")).eql("disconnected");
    });
  });

  describe("#userJoined", function() {
    it("should add a user if not present in the list yet", function() {
      collection.userJoined("dan");

      expect(collection).to.have.length.of(3);
    });

    it("should set added user's presence status to connected", function() {
      collection.userJoined("boriss");

      expect(collection.findUser("boriss").get("presence")).eql("connected");
    });

    it("shouldn't add a user if present in the list already", function() {
      collection.userJoined("jb");

      expect(collection).to.have.length.of(2);
    });

    it("should update existing user presence status to connected", function() {
      jb.set("presence", "disconnected");

      collection.userJoined("jb");

      expect(collection.findUser("jb").get("presence")).eql("connected");
    });
  });

  describe("#userLeft", function() {
    it("should update a contact presence status to disconnected", function() {
      collection.userLeft("jb");

      expect(jb.get("presence")).eql("disconnected");
    });
  });
});
