/* global app, chai, describe, it, beforeEach, afterEach, sinon */
var expect = chai.expect;

describe("UsersView", function() {
  describe("#initialize", function() {
    var sandbox, usersView;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      app.data.user = new app.models.User();
      app.data.user.on = sandbox.spy();
      usersView = new app.views.UsersView({
        collection: new app.models.UserSet()
      });
    });

    afterEach(function() {
      usersView = undefined;
      sandbox.restore();
    });

    it("should listen to the user model for signout", function() {
      sinon.assert.calledOnce(app.data.user.on);
      sinon.assert.calledWith(app.data.user.on, "signout");
    });

    it("should reset the User Set collection on signout", function() {
      sandbox.stub(app.data.users, "reset");

      // Call the signout callback
      app.data.user.on.args[0][1]();

      sinon.assert.calledOnce(app.data.users.reset);
    });

    it("should render the view when the collection is reset", function() {
      sandbox.stub(usersView, "render");

      app.data.users.trigger('reset');

      sinon.assert.calledOnce(usersView.render);
    });

    it("should render the view when the collection is changed", function() {
      sandbox.stub(usersView, "render");

      app.data.users.trigger('change');

      sinon.assert.calledOnce(usersView.render);
    });
  });
});
