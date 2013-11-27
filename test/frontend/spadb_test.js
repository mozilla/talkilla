/*global sinon, chai, SPADB, IDBDatabase, IDBObjectStore */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("SPADB", function() {
  var sandbox, spadb;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    spadb = new SPADB({
      dbname: "EnabledSPATest"
    });
  });

  afterEach(function(done) {
    spadb.drop(function() {
      done();
    });
    sandbox.restore();
  });


  describe("#load", function() {

    it("should load the database", function(done) {
      spadb.load(function(err, db) {
        expect(err).to.equal(null);
        expect(db).to.be.an.instanceOf(IDBDatabase);
        expect(spadb.db).to.be.an.instanceOf(IDBDatabase);
        expect(spadb.db).to.deep.equal(db);
        done();
      });
    });

    it("shouldn't throw if the database is already loaded", function(done) {
      spadb.load(function(err, db1) {
        spadb.load(function(err, db2) {
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
      spadb.load(function(err) {
        expect(err).eql("load error");
        done();
      });
    });

  });

  describe("#add", function() {

    it("should add a record to the database", function(done) {
      var spec = {name: "Random SPA", src: "/a/b/c.js", credentials: {}};

      spadb.add(spec, function(err, record) {
        expect(err).to.equal(null);
        expect(record).to.deep.equal(spec);

        this.all(function(err, specs) {
          expect(specs).to.deep.equal([spec]);
          done();
        });
      });
    });

    it("shouldn't raise an error in case of a duplicate record",
      function(done) {
        var spec = {name: "Random SPA", src: "/a/b/c.js", credentials: {}};

        spadb.add(spec, function(err) {
          expect(err).to.equal(null);

          this.add(spec, function(err) {
            expect(err).to.equal(null);
            done();
          });
        });
      });

    it("should pass back any add error", function(done) {
      var spec = {name: "Random SPA", src: "/a/b/c.js", credentials: {}};
      sandbox.stub(IDBObjectStore.prototype, "add", function() {
        throw new Error("add error");
      });

      spadb.add(spec, function(err) {
        expect(err).equal("add error");
        done();
      });
    });

    it("should pass back any transaction error", function(done) {
      var spec = {name: "Random SPA", src: "/a/b/c.js", credentials: {}};
      sandbox.stub(IDBObjectStore.prototype, "add", function() {
        var request = {};
        setTimeout(function() {
          request.onerror({target: {error: {name: "InvalidStateError",
                                            message: "add error"}}});
        });
        return request;
      });

      spadb.add(spec, function(err) {
        expect(err.message).eql("add error");
        done();
      });
    });

  });

  describe("#all", function() {

    it("should retrieve no record when db is empty", function(done) {
      spadb.all(function(err, specs) {
        expect(specs).to.have.length.of(0);
        done();
      });
    });

    it("should retrieve all records", function(done) {
      var spec1 = {name: "Random SPA 1", src: "/a/b/c.js", credentials: {}};
      var spec2 = {name: "Random SPA 2", src: "/a/b/c.js", credentials: {}};

      spadb.add(spec1, function() {
        this.add(spec2, function() {
          this.all(function(err, specs) {
            specs = specs.map(function(spec) {
              return spec.name;
            });

            expect(err).to.equal(null);
            expect(specs).to.have.length.of(2);
            // Chai's include/contains does not support deep equality.
            // For more infos: https://github.com/chaijs/chai/issues/97
            expect(specs).to.contain(spec1.name);
            expect(specs).to.contain(spec2.name);
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
      spadb.all(function(err) {
        expect(err).eql("all error");
        done();
      });
    });

  });

});

