/* global app, describe, it, beforeEach, afterEach, sinon */

describe("UsersView", function() {
  var sandbox, usersView;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(app.views.UsersView.prototype, "render");
    usersView = new app.views.UsersView({
      collection: new app.models.UserSet()
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
});
