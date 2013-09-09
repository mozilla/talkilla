/*global chai, sinon, _config:true, loadconfig, _signinCallback,
   _currentUserData:true, UserData, getContactsDatabase,
   storeContact, contacts:true, contactsDb:true, indexedDB,
   updateCurrentUsers, currentUsers, _, server */
var expect = chai.expect;
var contactDBName = "TalkillaContactsUnitTest";

describe('Miscellaneous', function() {
  "use strict";
  var sandbox;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
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
    afterEach(function() {
      contactsDb.close();
      contactsDb = undefined;
      contacts = undefined;
      indexedDB.deleteDatabase(contactDBName);
    });

    it("should store contacts", function(done) {
        getContactsDatabase(function() {
          // Check that we start with an empty contact list.
          expect(contacts).to.eql([]);
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
        }, contactDBName);
      });
  });

  describe("show offline contacts", function() {
    it("should merge local contacts with online contacts from the server",
       function() {
          contacts = ["foo"];
          updateCurrentUsers([{nick: "jb"}]);
          expect(currentUsers).to.eql([
            {nick: "foo", presence: "disconnected"},
            {nick: "jb", presence: "connected"}
          ]);
        });
  });
});
