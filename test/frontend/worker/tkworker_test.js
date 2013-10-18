/*global chai, sinon, TkWorker, CollectedContacts, ports */

var expect = chai.expect;

describe("tkWorker", function() {
  "use strict";
  var sandbox, worker;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    worker = new TkWorker({
      ports: ports,
      contactsDb: new CollectedContacts({
        dbname: "TalkillaContactsTest"
      })
    });
  });

  afterEach(function (done) {
    sandbox.restore();
    worker.contactsDb.drop(function() {
      done();
    });
  });

  describe("#loadContacts", function() {
    beforeEach(function(done) {
      // Store a contact for the tests
      worker.contactsDb.add("foo", function() {
        done();
      });
    });

    it("should load contacts from the database", function() {
      sandbox.stub(worker.contactsDb, "all");

      worker.loadContacts();

      sinon.assert.calledOnce(worker.contactsDb.all);
    });

    it("should update users list with retrieved contacts",
      function(done) {
        sandbox.stub(worker, "updateContactList");

        worker.loadContacts(function(err, contacts) {
          sinon.assert.calledOnce(worker.updateContactList);
          sinon.assert.calledWithExactly(worker.updateContactList, contacts);
          done();
        });
      });

    it("should pass the callback any db error", function(done) {
      sandbox.stub(worker.contactsDb, "all", function(cb) {
        cb("contacts error");
      });

      worker.loadContacts(function(err) {
        expect(err).eql("contacts error");
        done();
      });
    });

    it("should broadcast an error message on failure", function() {
      var err = new Error("ko");
      sandbox.stub(ports, "broadcastError");
      sandbox.stub(worker.contactsDb, "all", function(cb) {
        cb(err);
      });

      worker.loadContacts();

      sinon.assert.calledOnce(ports.broadcastError);
      sinon.assert.calledWithExactly(ports.broadcastError, err);
    });
  });

  describe("#updateContactList", function() {
    it("should update current users list with contacts", function() {
      var contacts = [{username: "foo"}];
      sandbox.stub(worker.currentUsers, "updateContacts");

      worker.updateContactList(contacts);

      sinon.assert.calledOnce(worker.currentUsers.updateContacts);
      sinon.assert.calledWithExactly(worker.currentUsers.updateContacts,
                                     contacts);
    });

    it("should broadcast a talkilla.users event", function() {
      sandbox.stub(ports, "broadcastEvent");

      worker.updateContactList([{username: "foo"}, {username: "bar"}]);

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "disconnected"},
        {nick: "bar", presence: "disconnected"}
      ]);
    });
  });
});

