/*global sinon, _signinCallback, spa, browserPort:true, tkWorker */

describe('Miscellaneous', function() {
  "use strict";
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe("#_signinCallback", function() {
    var socketStub, testableCallback;

    beforeEach(function() {
      sandbox.stub(window, "WebSocket");
      socketStub = sinon.stub(spa, "connect");
      sandbox.stub(tkWorker.user, "send");
      testableCallback = _signinCallback.bind({postEvent: function(){}});
    });

    afterEach(function() {
      tkWorker.user.reset();
      socketStub.restore();
    });

    it("should initiate the presence connection if signin succeded",
      function() {
        var nickname = "bill";
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.calledOnce(socketStub);
      });

    it("should not initiate the presence connection if signin failed",
      function() {
        var nickname;
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.notCalled(socketStub);
      });
  });
});
