/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("UsersView", function() {
  var sandbox, user, collection;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    user = new app.models.CurrentUser({username: "niko"});

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
      usersView.render();
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    describe("#render", function() {
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

    describe("Collection events", function() {
      describe("add", function() {
        it("should append a new user entry to an empty list", function() {
          collection.reset([]);

          collection.userJoined("bob@dylan.com");

          expect(usersView.$("a[rel]").eq(0).attr("rel")).eql("bob@dylan.com");
        });

        it("should add a new user entry at the beginning of the list",
          function() {
            collection.userJoined("0@zero.com");

            expect(usersView.$("a[rel]").eq(0).attr("rel")).eql("0@zero.com");
          });

        it("should add a new user entry at the end of the list", function() {
          collection.userJoined("z@zzz.com");

          expect(usersView.$("a[rel]").eq(2).attr("rel")).eql("z@zzz.com");
        });
      });
    });
  });
});
