/*global sinon, chai, ContactsDB, IDBDatabase, IDBObjectStore */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("ContactsDB", function() {
  var sandbox, contactsDb;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    contactsDb = new ContactsDB({
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
      expect(contactsDb.options.version).eql(2);
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
      contactsDb.load(function(err, db1) {
        contactsDb.load(function(err, db2) {
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

    describe("upgrade", function() {
      beforeEach(function(done) {
        // Construct a V1 database
        var request = indexedDB.open("UpdateContactsV1", 1);

        request.onupgradeneeded = function(event) {
          // the callback will be called by the onsuccess event handler when the
          // whole operation is performed
          var db = event.target.result;
          var store = db.createObjectStore("contacts", {
            keyPath: "username"
          });
          store.createIndex("username", "username", {unique: true});
        };

        request.onsuccess = function(event) {
          var db = event.target.result;
          // Now close the db.
          db.close();
          done();
        };

        request.onerror = function(event) {
          throw event.target.errorCode;
        };
      });

      afterEach(function(done) {
        sandbox.restore();
        var request = indexedDB.deleteDatabase("UpdateContactsV1");
        request.onsuccess = function() {
          done();
        };

        request.onerror = function(event) {
          throw event.target.errorCode;
        };
      });

      it("should upgrade the database", function(done) {
        var dbV1 = new ContactsDB({
          dbname: "UpdateContactsV1"
        });
        dbV1.load(function(err, db) {
          expect(db.version).to.equal(2);

          // Check the new index is available
          var store = this.db.transaction(this.options.storename, "readonly")
                          .objectStore(this.options.storename);

          expect(store.indexNames.contains("source")).to.be.equal(true);

          db.close();
          done();
        });
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

  describe("#replaceSourceContacts", function() {
    it("should delete existing contacts for the specified source",
      function(done) {
        // First add a couple of contacts - one with the google source,
        // one without.
        contactsDb.add({username: "florian"}, function(err) {
          if (err)
            throw err;
          contactsDb.add({username: "rt", source: "google"}, function(err) {
            if (err)
              throw err;

            // Now for the real test
            contactsDb.replaceSourceContacts([], "google",
              function(err, result) {
                expect(err).to.be.a("null");
                expect(result).eql([]);

                contactsDb.all(function(err, result) {
                  expect(err).to.be.a("null");
                  expect(result).eql([{username: "florian"}]);
                  done();
                });
              });
          });
        });
      });

    it("should add supplied contacts tagged with their source", function(done) {
      var contacts = [
        {username: "rt"},
        {username: "florian"}
      ];
      var expected = [
        {username: "rt", source: "google"},
        {username: "florian", source: "google"}
      ];
      contactsDb.replaceSourceContacts(contacts, "google",
        function(err, result) {
          expect(err).to.be.a("null");
          expect(result).eql(expected);

          this.all(function(err, result) {
            expect(result).eql(expected);
            done();
          });
        });
    });

    it("should pass back any add error", function(done) {
      sandbox.stub(IDBObjectStore.prototype, "add", function() {
        throw new Error("add error");
      });
      contactsDb.replaceSourceContacts([{username: "foo"}], "google",
        function(err) {
          expect(err).eql("add error");
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
