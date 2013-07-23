/* global app, describe, it, beforeEach, afterEach, sinon */

describe("NotificationsView", function() {
  var sandbox, user, notificationsView;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {
    it("should attach to the user model for signin/signout", function() {
      sandbox.stub(app.models.User.prototype, "on");
      user = new app.models.User();
      notificationsView = new app.views.NotificationsView({user: user});

      sinon.assert.called(user.on);
      sinon.assert.calledWith(user.on, "signin signout");
    });
  });

  describe("#clear", function() {
    var notificationsView;

    beforeEach(function() {
      sandbox.stub(app.views.NotificationsView.prototype, "clear");
      user = new app.models.User();
      notificationsView = new app.views.NotificationsView({user: user});
    });

    it("should clear the NotificationsView on signin", function() {
      user.trigger('signin');

      sinon.assert.calledOnce(notificationsView.clear);
    });

    it("should clear the NotificationsView on signout", function() {
      user.trigger('signout');

      sinon.assert.calledOnce(notificationsView.clear);
    });
  });
});
