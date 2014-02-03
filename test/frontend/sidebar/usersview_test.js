/*global app, chai, sinon */
"use strict";

var expect = chai.expect;

describe("UsersView", function() {
  var sandbox, user, collection;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    user = new app.models.CurrentUser();

    collection = new app.models.UserSet([
      {email: "a@a.com", presence: "disconnected"},
      {email: "b@b.com", presence: "disconnected"}
    ]);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("Unit tests", function() {
    var usersView;

    beforeEach(function() {
      sandbox.stub(app.views.UsersView.prototype, "render");

      usersView = new app.views.UsersView({
        user: user,
        collection: collection,
        appStatus: new app.models.AppStatus()
      });
    });

    describe("#initialize", function() {
      it("should create all child views", function() {
        expect(usersView.views).to.have.length.of(2);
      });
    });

    describe("Events", function() {
      describe("CurrentUser", function() {
        describe("signin", function() {
          it("should render the view when the user signs in and the " +
             "collection is reset", function() {
            user.trigger("signin");
            collection.reset([]);

            sinon.assert.calledOnce(usersView.render);
          });

          it("should render a single time once user is signed in", function() {
            user.trigger("signin");
            collection.reset([]);
            collection.reset([]);

            sinon.assert.calledOnce(usersView.render);
          });
        });

        describe("signout", function() {
          it("should render the view", function() {
            user.trigger("signout");

            sinon.assert.calledOnce(usersView.render);
          });
        });
      });

      describe("AppStatus events", function() {
        beforeEach(function() {
          usersView.collection.reset([
            {username: "bob", presence: "connected"},
            {username: "bill", presence: "disconnected"}
          ]);
        });

        it("should change user status if a reconnection is ongoing",
          function() {
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
  });

  describe("DOM tests", function() {
    var usersView;

    beforeEach(function() {
      $("#fixtures").append('<ul id="users"></ul>');

      usersView = new app.views.UsersView({
        user: user,
        collection: collection,
        appStatus: new app.models.AppStatus()
      });
    });

    afterEach(function() {
      $("#fixtures").empty();
    });

    describe("#render", function() {
      it("should render all child views", function() {
        usersView.render();

        expect(usersView.$("li")).to.have.length.of(2);
      });

      it("should update a user entry when presence changes", function() {
        usersView.render();

        collection.setUserPresence("a@a.com", "connected");

        expect(usersView.$(".status-connected")).to.have.length.of(1);
      });
    });
  });
});
