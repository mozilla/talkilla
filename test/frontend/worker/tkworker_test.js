/*global chai, sinon, contactsDb, TkWorker, ports */

var expect = chai.expect;

describe("tkWorker", function() {
  "use strict";
  var sandbox, worker;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    contactsDb.options.dbname = "TalkillaContactsTest";
    worker = new TkWorker({
      ports: ports,
      contactsDb: contactsDb
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

    it("should load contacts from the database", function() {
      sandbox.stub(contactsDb, "all");

      worker.loadContacts();

      sinon.assert.calledOnce(contactsDb.all);
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
      sandbox.stub(contactsDb, "all", function(cb) {
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
      sandbox.stub(contactsDb, "all", function(cb) {
        cb(err);
      });

      worker.loadContacts();

      sinon.assert.calledOnce(ports.broadcastError);
      sinon.assert.calledWithExactly(ports.broadcastError, err);
    });
  });

  describe("#updateContactList", function() {
    var contacts = [{username: "foo"}, {username: "bar"}];

    it("should add contacts to the currentUsers list", function() {
      worker.updateContactList(contacts);

      expect(worker.currentUsers).eql({
        foo: {presence: "disconnected"},
        bar: {presence: "disconnected"}
      });
    });

    it("shouldn't duplicate contacts", function() {
      worker.currentUsers.foo = {presence: "connected"};

      worker.updateContactList(contacts);

      expect(worker.currentUsers).eql({
        foo: {presence: "connected"},
        bar: {presence: "disconnected"}
      });
    });

    it("should broadcast a talkilla.users event", function() {
      sandbox.stub(ports, "broadcastEvent");

      worker.updateContactList(contacts);

      sinon.assert.calledOnce(ports.broadcastEvent);
      sinon.assert.calledWith(ports.broadcastEvent, "talkilla.users", [
        {nick: "foo", presence: "disconnected"},
        {nick: "bar", presence: "disconnected"}
      ]);
    });
  });
});

