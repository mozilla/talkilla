/*global app, sinon */
"use strict";

describe("UsersView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.views.UsersView.prototype, "render");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should render the view when the collection is reset", function() {
      var usersView = new app.views.UsersView({
        user: new app.models.User(),
        collection: new app.models.UserSet()
      });

      usersView.collection.trigger("change");

      sinon.assert.calledOnce(usersView.render);
    });

    it("should render the view when the collection is changed", function() {
      var usersView = new app.views.UsersView({
        user: new app.models.User(),
        collection: new app.models.UserSet()
      });

      usersView.collection.reset();

      sinon.assert.calledOnce(usersView.render);
    });
  });
});
