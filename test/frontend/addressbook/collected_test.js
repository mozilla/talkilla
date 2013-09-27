/*global chai, CollectedContacts, IDBDatabase */
/* jshint expr:true */

var expect = chai.expect;

describe("CollectedContacts", function() {
  var contactsDb;

  beforeEach(function() {
    // For some reason, indexedDB doesn't like creating two
    // databases with the same name in one run.
    contactsDb = new CollectedContacts({
      dbname: "TalkillaContactsTest",
      storename: "contacts",
      version: 1
    });
  });

  afterEach(function(done) {
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
  });

  describe("#add", function() {
    it("should add a record to the database", function(done) {
      contactsDb.add("florian", function(err, username) {
        expect(err).to.be.a("null");
        expect(username).eql("florian");
        done();
      });
    });

    it("shouldn't raise an error in case of a duplicate contact",
      function(done) {
        contactsDb.add("niko", function(err) {
          expect(err).to.be.a("null");
          this.add("niko", function(err) {
            expect(err).to.be.a("null");
            done();
          });
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
      contactsDb.add("niko", function() {
        this.add("jb", function() {
          this.all(function(err, contacts) {
            expect(err).to.be.a("null");
            expect(contacts).to.have.length.of(2);
            expect(contacts).to.contain("niko");
            expect(contacts).to.contain("jb");
            done();
          });
        });
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
      contactsDb.add("niko", function() {
        this.drop(function(err) {
          expect(err).to.be.a("null");
          this.all(function(err, contacts) {
            expect(contacts).to.have.length.of(0);
            done();
          });
        });
      });
    });
  });
});
