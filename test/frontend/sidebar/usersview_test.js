/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("UsersView", function() {
  var sandbox, user, collection;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    user = new app.models.CurrentUser();

    collection = new app.models.UserSet([
      {username: "a@a.com", email: "a@a.com", presence: "disconnected"},
      {username: "b@b.com", email: "b@b.com", presence: "disconnected",
       isContact: true}
    ]);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("DOM tests", function() {
    var usersView;

    beforeEach(function() {
      $("#fixtures").append('<nav id="users"><ul></ul></nav>');

      usersView = new app.views.UsersView({
        user: user,
        collection: collection
      });
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    describe("#render", function() {
      beforeEach(function() {
        usersView.render();
      });

      it("should render all child views", function() {
        expect(usersView.$("li")).to.have.length.of(2);
      });

      it("should add a user entry on new user joined", function() {
        collection.userJoined("a@a.com");

        expect(usersView.$("a[rel='a@a.com'] .status-connected"))
          .to.have.length.of(1);
      });

      it("should remove a user entry on user left", function() {
        collection.userLeft("a@a.com");

        expect(usersView.$("a[rel='a@a.com']")).to.have.length.of(0);
      });

      it("should update contact presence on contact joined", function() {
        collection.userJoined("b@b.com");

        expect(usersView.$("a[rel='b@b.com'] .status-connected"))
          .to.have.length.of(1);
      });

      it("should keep and updates contact presence when left", function() {
        collection.userLeft("b@b.com");

        expect(usersView.$("a[rel='b@b.com'] .status-disconnected"))
          .to.have.length.of(1);
      });
    });
  });
});
