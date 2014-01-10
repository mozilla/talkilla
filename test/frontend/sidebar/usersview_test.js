/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("UsersView", function() {
  var sandbox, usersView;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.views.UsersView.prototype, "render");

    usersView = new app.views.UsersView({
      user: new app.models.CurrentUser(),
      collection: new app.models.UserSet(),
      appStatus: new app.models.AppStatus()
    });
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should render the view when the collection is reset", function() {
      usersView.collection.trigger("change");

      sinon.assert.calledOnce(usersView.render);
    });

    it("should render the view when the collection is changed", function() {
      usersView.collection.reset();

      sinon.assert.calledOnce(usersView.render);
    });
  });

  describe("AppStatus 'reconnecting' events", function() {
    beforeEach(function() {
      usersView.collection.reset([
          {username: "bob", presence: "connected"},
          {username: "bill", presence: "disconnected"}
        ]);
    });

    it("should change user status if a reconnection is ongoing", function() {
      usersView.appStatus.set("reconnecting", {timeout: 42, attempt: 2});
      expect(usersView.collection.every(function(user) {
        return user.get("presence") === "disconnected";
      })).to.eql(true);
    });

    it("should not change the users' status if no reconnection is ongoing",
      function(){
      usersView.appStatus.set("reconnecting", false);
      expect(usersView.collection.every(function(user) {
        return user.get("presence") === "disconnected";
      })).to.eql(false);
    });
  });
});
