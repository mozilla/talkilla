/* global app, describe, it, beforeEach, afterEach, sinon, AppPort */

describe("UserEntryView", function() {
  var sandbox, sidebarApp;

  function createFakeSidebarApp() {
    // exposes a global sidebarApp for view consumption
    // XXX: FIX THAT
    window.sidebarApp = {
      user: new app.models.User(),
      port: new AppPort()
    };
    return window.sidebarApp;
  }

  beforeEach(function() {
    sandbox = sinon.sandbox.create();

    // mozSocial "mock"
    navigator.mozSocial = {
      getWorker: function() {
        return {
          port: {postMessage: sinon.spy()}
        };
      }
    };

    sandbox.stub(AppPort.prototype, "postEvent");

    sidebarApp = createFakeSidebarApp();
    sidebarApp.openConversation = sandbox.spy();
  });

  afterEach(function() {
    sandbox.restore();
    window.sidebarApp = undefined;
  });

  describe("#call", function() {
    it("should ask the app to open a new conversation", function () {
      var view = new app.views.UserEntryView();

      var clickEvent = {
        preventDefault: function() {},
        currentTarget: {
          getAttribute: function() {return "william";}
        }
      };

      view.openConversation(clickEvent);

      sinon.assert.calledOnce(sidebarApp.openConversation);
      sinon.assert.calledWith(sidebarApp.openConversation, "william");
    });
  });
});
