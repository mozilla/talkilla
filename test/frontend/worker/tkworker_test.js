/*global chai, sinon, contactsDb, TkWorker, currentUsers, ports */

var expect = chai.expect;

describe("tkWorker", function() {
  "use strict";
  var sandbox, worker;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    contactsDb.options.dbname = "TalkillaContactsTest";
    worker = new TkWorker({
      ports: ports,
      contactsDb: contactsDb,
      currentUsers: currentUsers
    });
  });

  afterEach(function (done) {
    sandbox.restore();
    contactsDb.drop(function() {
      done();
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
      worker.loadContacts(function() {
        expect(currentUsers).eql({
          foo: {presence: "disconnected"}
        });
        done();
      });
    });

    it("should broadcast a talkilla.users event", function(done) {
      sandbox.stub(ports, "broadcastEvent");
      worker.loadContacts(function() {
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

      worker.loadContacts();

      sinon.assert.calledOnce(ports.broadcastError);
      sinon.assert.calledWithExactly(ports.broadcastError, err);
    });
  });
});

