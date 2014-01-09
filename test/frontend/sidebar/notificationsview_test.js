/*global app, sinon */
"use strict";

describe("NotificationsView", function() {
  var sandbox, user, view;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    user = new app.models.CurrentUser();
    sandbox.stub(app.utils, "notifyUI");
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#clear", function() {

    beforeEach(function() {
      sandbox.stub(app.views.NotificationsView.prototype, "clear");
      view = new app.views.NotificationsView({
        user: user,
        appStatus: new app.models.AppStatus()
      });
    });

    it("should clear the NotificationsView on signin", function() {
      user.trigger('signin');

      sinon.assert.calledOnce(view.clear);
    });

    it("should clear the NotificationsView on signout", function() {
      user.trigger('signout');

      sinon.assert.calledOnce(view.clear);
    });
  });

  describe("#notifyReconnection", function() {
    beforeEach(function() {
      view = new app.views.NotificationsView({
        user: user,
        appStatus: new app.models.AppStatus()
      });
    });

    it("should notify the UI", function() {
      view.notifyReconnection({timeout: 42, attempt: 2});

      sinon.assert.calledOnce(app.utils.notifyUI);
      sinon.assert.calledWithMatch(app.utils.notifyUI, /0\.042s/,
                                   "error", 42);

    });

    it("should call #clear", function() {
      sandbox.stub(view, "clear");
      view.notifyReconnection({timeout: 42, attempt: 2});

      sinon.assert.calledOnce(view.clear);
      sinon.assert.calledWithExactly(view.clear);
    });
  });
});
