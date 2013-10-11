/*global sinon, chai, CollectedContacts, IDBDatabase, IDBObjectStore */
/* jshint expr:true */

var expect = chai.expect;

describe("CollectedContacts", function() {
  var sandbox, contactsDb;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    contactsDb = new CollectedContacts({
      dbname: "TalkillaContactsTest"
    });
  });

  afterEach(function(done) {
    sandbox.restore();
    contactsDb.drop(function() {
      done();
    });
  });

  describe("#constructor", function() {
    it("should construct an object", function() {
      expect(contactsDb).to.be.a("object");
    });

    it("should set default options", function() {
      expect(contactsDb.options).to.include.keys(
        "dbname", "storename", "version");
      expect(contactsDb.options.storename).eql("contacts");
      expect(contactsDb.options.version).eql(1);
    });
  });

  describe("#load", function() {
    it("should load the database", function(done) {
      contactsDb.load(function(err, db) {
        expect(err).to.be.a("null");
        expect(db).to.be.an.instanceOf(IDBDatabase);
        expect(contactsDb.db).to.be.an.instanceOf(IDBDatabase);
        expect(contactsDb.db).to.deep.equal(db);
        done();
      });
    });

    it("shouldn't throw if the database is already loaded", function(done) {
      contactsDb.load(function(db1) {
        contactsDb.load(function(db2) {
          expect(db1).eql(db2);
          done();
        });
      });
    });

    it("should pass back any encountered error", function(done) {
      sandbox.stub(indexedDB, "open", function() {
        var request = {};
        setTimeout(function() {
          request.onerror({target: {errorCode: "load error"}});
        });
        return request;
      });
      contactsDb.load(function(err) {
        expect(err).eql("load error");
        done();
      });
    });
  });

  describe("#add", function() {
    it("should add a record to the database", function(done) {
      var contact = {username: "florian"};
      contactsDb.add(contact, function(err, username) {
        expect(err).to.be.a("null");
        expect(username).eql(contact);
        this.all(function(err, contacts) {
          expect(contacts).eql([contact]);
          done();
        });
      });
    });

    it("shouldn't raise an error in case of a duplicate contact",
      function(done) {
        var contact = {username: "niko"};
        contactsDb.add(contact, function(err) {
          expect(err).to.be.a("null");
          this.add(contact, function(err) {
            expect(err).to.be.a("null");
            done();
          });
        });
      });

    it("should pass back any add error", function(done) {
      sandbox.stub(IDBObjectStore.prototype, "add", function() {
        throw new Error("add error");
      });
      contactsDb.add({username: "foo"}, function(err) {
        expect(err).eql("add error");
        done();
      });
    });

    it("should pass back any transaction error", function(done) {
      sandbox.stub(IDBObjectStore.prototype, "add", function() {
        var request = {};
        setTimeout(function() {
          request.onerror({target: {error: {name: "InvalidStateError",
                                            message: "add error"}}});
        });
        return request;
      });
      contactsDb.add({username: "foo"}, function(err) {
        expect(err.message).eql("add error");
        done();
      });
    });
  });

  describe("#all", function() {
    it("should retrieve no record when db is empty", function(done) {
      contactsDb.all(function(err, contacts) {
        expect(contacts).to.have.length.of(0);
        done();
      });
    });

    it("should retrieve all contacts", function(done) {
      var niko = {username: "niko"}, jb = {username: "jb"};
      contactsDb.add(niko, function() {
        this.add(jb, function() {
          this.all(function(err, contacts) {
            expect(err).to.be.a("null");
            expect(contacts).to.have.length.of(2);
            expect(contacts.map(function(record) {
              return record.username;
            })).eql([niko.username, jb.username]);
            done();
          });
        });
      });
    });

    it("should preserve the order of insertion", function(done) {
      var niko = {username: "niko"}, jb = {username: "jb"};
      contactsDb.add(niko, function() {
        this.add(jb, function() {
          this.all(function(err, contacts) {
            expect(contacts).eql([niko, jb]);
            done();
          });
        });
      });
    });

    it("should pass back any encountered error", function(done) {
      sandbox.stub(IDBObjectStore.prototype, "openCursor", function() {
        var cursor = {};
        setTimeout(function() {
          cursor.onerror({target: {errorCode: "all error"}});
        });
        return cursor;
      });
      contactsDb.all(function(err) {
        expect(err).eql("all error");
        done();
      });
    });
  });

  describe("#close", function() {
    it("should close the database", function() {
      contactsDb.close();
      expect(contactsDb.db).to.be.a("undefined");
    });
  });

  describe("#drop", function() {
    it("should drop the database", function(done) {
      contactsDb.add({username: "niko"}, function() {
        this.drop(function(err) {
          expect(err).to.be.a("null");
          this.all(function(err, contacts) {
            expect(contacts).to.have.length.of(0);
            done();
          });
        });
      });
    });

    it("should pass back any encountered error", function(done) {
      sandbox.stub(indexedDB, "deleteDatabase", function() {
        var request = {};
        setTimeout(function() {
          request.onerror({target: {errorCode: "drop error"}});
        });
        return request;
      });
      contactsDb.drop(function(err) {
        expect(err).eql("drop error");
        done();
      });
    });
  });
});
