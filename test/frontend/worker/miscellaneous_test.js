/*global chai, sinon, _signinCallback,
   _currentUserData:true, UserData, browserPort:true, contactsDb:true,
   loadContacts, currentUsers, spa, ports */

var expect = chai.expect;

describe('Miscellaneous', function() {
  "use strict";
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
    contactsDb.options.dbname = "TalkillaContactsTest";
  });

  afterEach(function (done) {
    sandbox.restore();
    contactsDb.drop(function() {
      done();
    });
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
  });

  describe("#loadContacts", function() {
    beforeEach(function(done) {
      // Store a contact for the tests
      contactsDb.add("foo", function() {
        done();
      });
    });

    it("should add contacts to the currentUsers list", function(done) {
      loadContacts(function() {
        expect(currentUsers).eql({
          foo: {presence: "disconnected"}
        });
        done();
      });
    });

    it("should broadcast a talkilla.users event", function(done) {
      sandbox.stub(ports, "broadcastEvent");
      loadContacts(function() {
        sinon.assert.calledOnce(ports.broadcastEvent);
        sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
          {nick: "foo", presence: "disconnected"}
        ]);
        done();
      });
    });

    it("should broadcast an error message on failure", function() {
      var err = new Error("ko");
      sandbox.stub(ports, "broadcastError");
      sandbox.stub(contactsDb, "all", function(cb) {
        cb(err);
      });

      loadContacts();

      sinon.assert.calledOnce(ports.broadcastError);
      sinon.assert.calledWithExactly(ports.broadcastError, err);
    });
  });
});
