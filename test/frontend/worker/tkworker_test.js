/*global chai, sinon, TkWorker, PortCollection, SPA, ContactsDB, SPADB,
  UserData, browserPort:true */
"use strict";

var expect = chai.expect;

describe("tkWorker", function() {
  var sandbox, worker;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    browserPort = {postEvent: sandbox.spy()};
    worker = new TkWorker({
      ports: new PortCollection(),
      user: new UserData({}, {}),
      contactsDb: new ContactsDB({
        dbname: "TalkillaContactsTest"
      }),
      spaDb: new SPADB({
        dbname: "EnabledSPATest"
      })
    });
  });

  afterEach(function (done) {
    sandbox.restore();
    browserPort = undefined;
    worker.contactsDb.drop(function() {
      done();
    });
  });

  describe("#initialize", function() {
    it("should load the SPAs", function() {
      sandbox.stub(worker, "loadSPAs");

      worker.initialize();

      sinon.assert.calledOnce(worker.loadSPAs);
    });
  });

  describe("#closeSession", function() {
    it("should reset current user data", function() {
      sandbox.stub(worker.user, "reset");

      worker.closeSession();

      sinon.assert.calledOnce(worker.user.reset);
    });

    it("should reset current users list", function() {
      sandbox.stub(worker.users, "reset");

      worker.closeSession();

      sinon.assert.calledOnce(worker.users.reset);
    });

    it("should close contacts database", function() {
      sandbox.stub(worker.contactsDb, "close");

      worker.closeSession();

      sinon.assert.calledOnce(worker.contactsDb.close);
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
      sandbox.stub(worker.ports, "broadcastError");
      sandbox.stub(worker.contactsDb, "all", function(cb) {
        cb(err);
      });

      worker.loadContacts();

      sinon.assert.calledOnce(worker.ports.broadcastError);
      sinon.assert.calledWithExactly(worker.ports.broadcastError, err);
    });
  });

  describe("#updateContactsFromSource", function() {
    var contacts;

    beforeEach(function() {
      contacts = [{username: "foo"}];
      sandbox.stub(worker.contactsDb, "replaceSourceContacts");
      sandbox.stub(worker.users, "updateContacts");
    });

    it("should tell the contacts database to replace the contacts", function() {
      worker.updateContactsFromSource(contacts, "google");

      sinon.assert.calledOnce(worker.contactsDb.replaceSourceContacts);
    });

    it("should update current users list with contacts", function() {
      worker.updateContactList(contacts);

      sinon.assert.calledOnce(worker.users.updateContacts);
      sinon.assert.calledWithExactly(worker.users.updateContacts,
                                     contacts);
    });
  });

  describe("#updateContactList", function() {
    it("should update current users list with contacts", function() {
      var contacts = [{username: "foo"}];
      sandbox.stub(worker.users, "updateContacts");

      worker.updateContactList(contacts);

      sinon.assert.calledOnce(worker.users.updateContacts);
      sinon.assert.calledWithExactly(worker.users.updateContacts,
                                     contacts);
    });

    it("should broadcast a talkilla.users event", function() {
      sandbox.stub(worker.ports, "broadcastEvent");

      worker.updateContactList([{username: "foo"}, {username: "bar"}]);

      sinon.assert.calledOnce(worker.ports.broadcastEvent);
      sinon.assert.calledWith(worker.ports.broadcastEvent, "talkilla.users", [
        {username: "foo", presence: "disconnected"},
        {username: "bar", presence: "disconnected"}
      ]);
    });
  });

  describe("#loadSPAs", function() {

    var spa;

    beforeEach(function(done) {
      var spec = {
        name: "Random SPA",
        src: "/path/to/spa",
        credentials: "fake credentials"
      };
      spa = {connect: sinon.spy(), on: function() {}};
      sandbox.stub(window, "SPA").returns(spa);
      worker.spaDb.add(spec, function() {
        done();
      });
    });

    afterEach(function(done) {
      worker.spaDb.drop(function() {
        done();
      });
    });

    it("should instantiate a new SPA with the given src", function(done) {
      worker.loadSPAs(function() {
        sinon.assert.calledOnce(SPA);
        sinon.assert.calledWithExactly(SPA, {src: "/path/to/spa"});
        done();
      });
    });

    it("should connect the created SPA with given credentials",
      function(done) {
        worker.loadSPAs(function() {
          sinon.assert.calledOnce(spa.connect);
          sinon.assert.calledWithExactly(spa.connect, "fake credentials");
          done();
        });
      });
  });
});

