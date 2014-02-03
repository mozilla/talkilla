/*global app, chai */
"use strict";

var expect = chai.expect;

describe("UserSet Collection", function() {

  describe("#comparator", function() {
    it("should order username by default", function() {
      var collection = new app.models.UserSet();
      collection.add([{username:'jill'}, {username:'bill'}, {username:'bob'}]);
      expect(collection.at(0).get('username')).to.equal('bill');
      expect(collection.at(1).get('username')).to.equal('bob');
      expect(collection.at(2).get('username')).to.equal('jill');
    });
  });

  describe("#updatePresence", function() {
    it("should update the presence for all users", function() {
      var collection = new app.models.UserSet([
        {username: "a", presence: "disconnected"},
        {username: "b", presence: "disconnected"}
      ]);

      collection.updatePresence("connected");

      expect(collection.at(0).get("presence")).eql("connected");
      expect(collection.at(1).get("presence")).eql("connected");
    });

    it("should return current collection", function() {
      var collection = new app.models.UserSet();

      expect(collection.updatePresence("connected"))
             .to.be.an.instanceOf(app.models.UserSet);
    });
  });

});
