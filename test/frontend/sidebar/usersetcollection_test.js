/*global app, chai */
"use strict";

var expect = chai.expect;

describe("UserSet Collection", function() {
  var jb, chuck, collection;

  beforeEach(function() {
    jb = new app.models.User({
      fullName: "JB",
      email: "jb@pirates.org",
      phoneNumber: "123",
      presence: "connected"
    });
    chuck = new app.models.User({
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

  describe("#findUser", function() {
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
      collection.setUserPresence("123", "disconnected")

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

    it("should return current collection", function() {
      expect(collection.setGlobalPresence("connected"))
             .to.be.an.instanceOf(app.models.UserSet);
    });
  });

});
