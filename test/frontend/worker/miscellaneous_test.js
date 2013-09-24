/*global chai, sinon, _config:true, loadconfig, _signinCallback,
   _currentUserData:true, UserData, browserPort:true, contactsDb:true,
   loadContacts, currentUsers, _, server, ports */
var expect = chai.expect;

describe('Miscellaneous', function() {
  "use strict";
  var sandbox, contactsDbName, i = 0;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
    contactsDbName = "TalkillaContactsTest" + i++;
    contactsDb.options.dbname = contactsDbName;
  });

  afterEach(function (done) {
    sandbox.restore();
    contactsDb.drop(function() {
      done();
    });
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

  describe("#loadContacts", function() {
    beforeEach(function(done) {
      // Store a contact for the tests
      contactsDb.load(function() {
        this.add("foo", function() {
          this.close();
          done();
        });
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
  });
});
