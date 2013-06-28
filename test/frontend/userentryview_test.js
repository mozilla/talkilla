/* global app, describe, it, beforeEach, afterEach, sinon */

describe("UserEntryView", function() {
  var sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#call", function() {
    it("should send a talkilla.conversation-open message", function () {
      var view = new app.views.UserEntryView();
      sandbox.stub(app.port, "postEvent");

      var clickEvent = {
        preventDefault: function() {},
        currentTarget: {
          getAttribute: function (attr) {
            if (attr === 'rel')
              return "william";

            return undefined;
          }
        }
      };

      view.conversation(clickEvent);

      sinon.assert.calledOnce(app.port.postEvent);
      sinon.assert.calledWith(app.port.postEvent,
                              "talkilla.conversation-open",
                              { peer: "william" });
    });
  });
});
