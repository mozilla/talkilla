/*global sinon, _signinCallback, spa,
   _currentUserData:true, UserData, browserPort:true */

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
      _currentUserData = new UserData({});
      sandbox.stub(_currentUserData, "send");
      testableCallback = _signinCallback.bind({postEvent: function(){}});
    });

    afterEach(function() {
      _currentUserData = undefined;
      socketStub.restore();
    });

    it("should initiate the presence connection if signin succeded",
      function() {
        var nickname = "bill";
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.calledOnce(socketStub);
        sinon.assert.calledWith(socketStub, nickname);
      });

    it("should not initiate the presence connection if signin failed",
      function() {
        var nickname;
        testableCallback(null, JSON.stringify({nick: nickname}));
        sinon.assert.notCalled(socketStub);
      });

    it("should request for cookies if signin succeded", function() {
      testableCallback(null, JSON.stringify({nick: "jb"}));
      sinon.assert.calledOnce(browserPort.postEvent);
      sinon.assert.calledWithExactly(browserPort.postEvent,
                                     "social.cookies-get");
    });

    it("should not request for cookies if signin failed", function() {
      testableCallback(null, JSON.stringify({nick: undefined}));
      sinon.assert.notCalled(browserPort.postEvent);
    });
  });
});
