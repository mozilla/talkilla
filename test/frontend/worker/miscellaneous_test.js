/*global chai, sinon, _config:true, loadconfig, _signinCallback,
   _currentUserData:true, UserData, getContactsDatabase, browserPort: true,
   storeContact, contacts:true, contactsDb:true, indexedDB,
   currentUsers, _, server, ports */
var expect = chai.expect;

describe('Miscellaneous', function() {
  "use strict";
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
  });

  afterEach(function () {
    browserPort = undefined;
    sandbox.restore();
  });

  describe("#loadconfig", function() {
    var oldConfig, xhr, requests;

    beforeEach(function() {
      oldConfig = _.clone(_config);
      // XXX For some reason, sandbox.useFakeXMLHttpRequest doesn't want to work
      // nicely so we have to manually xhr.restore for now.
      xhr = sinon.useFakeXMLHttpRequest();
      _config = {};
      requests = [];
      xhr.onCreate = function (req) { requests.push(req); };
    });

    afterEach(function() {
      _config = oldConfig;
      xhr.restore();
    });

    it("should populate the _config object from using AJAX load",
      function(done) {
        expect(_config).to.deep.equal({});
        loadconfig(function(err, config) {
          expect(requests).to.have.length.of(1);
          expect(requests[0].url).to.equal('/config.json');
          expect(config).to.deep.equal({WSURL: 'ws://fake', DEBUG: true});
          done();
        });
        requests[0].respond(200, {
          'Content-Type': 'application/json'
        }, '{"WSURL": "ws://fake", "DEBUG": true}');
      });
  });

  describe("#_signinCallback", function() {
    var socketStub, wsurl = 'ws://fake', testableCallback;

    beforeEach(function() {
      sandbox.stub(window, "WebSocket");
      socketStub = sinon.stub(server, "connect");
      _config.WSURL = wsurl;
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

  describe("storeContact", function() {
    var contactDBName, i = 0;

    beforeEach(function(done) {
      // For some reason, indexedDB doesn't like creating two
      // databases with the same name in one run.
      contactDBName = "TalkillaContactsUnitTest" + i++;
      getContactsDatabase(function() {
        // Check that we start with an empty contact list.
        expect(contacts).to.eql([]);
        done();
      }, contactDBName);
    });

    afterEach(function() {
      contactsDb.close();
      contactsDb = undefined;
      contacts = undefined;
      indexedDB.deleteDatabase(contactDBName);
    });

    it("should store contacts", function(done) {
      storeContact("foo", function() {
        // Check that the contact has been added to the cached list.
        expect(contacts).to.eql(["foo"]);
        // Drop all references to the contact list
        contacts = undefined;
        contactsDb = undefined;
        getContactsDatabase(function() {
          expect(contacts).to.eql(["foo"]);
          done();
        }, contactDBName);
      });
    });

    describe("load contacts", function () {
      beforeEach(function(done) {
        // Store a contact for the tests
        storeContact("foo", function() {
          contacts = undefined;
          contactsDb = undefined;
          done();
        }, contactDBName);
      });

      it("should add contacts to the currentUsers list", function(done) {
        // Drop all references to the contact list
        getContactsDatabase(function() {
          expect(currentUsers).to.eql({
            foo: {presence: "disconnected"}
          });
          done();
        }, contactDBName);
      });

      it("should broadcast a talkilla.users event", function(done) {
        sandbox.stub(ports, "broadcastEvent");
        // Drop all references to the contact list
        getContactsDatabase(function() {
          sinon.assert.calledOnce(ports.broadcastEvent);
          sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
            {nick: "foo", presence: "disconnected"}
          ]);
          done();
        }, contactDBName);
      });
    });
  });
});
