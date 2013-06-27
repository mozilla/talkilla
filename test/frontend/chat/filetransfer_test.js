/* global app, chai, describe, it, sinon, beforeEach, afterEach */

/* jshint expr:true */
var expect = chai.expect;

describe("FileTransfer", function() {

  var sandbox, transfer, blob;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    blob = new Blob(['content'], {type: 'plain/text'})
    transfer = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {

    it("should have a state machine", function() {
      expect(transfer.state).to.be.an.instanceOf(Object);
    });

    it("should have a File object", function() {
      expect(transfer.file).to.equal(blob);
    });

    it("should have a chunk size parameter", function() {
      expect(transfer.chunkSize).to.equal(1);
    });

    it("should bind _onProgress to the chunk event", function() {
      sandbox.stub(app.models.FileTransfer.prototype, "_onProgress");
      transfer = new app.models.FileTransfer({file: blob}, {chunkSize: 1});

      transfer.trigger("chunk");

      sinon.assert.calledOnce(transfer._onProgress);
    });

  });

  describe("#start", function() {

    it("should change the state from ready to ongoing", function() {
      transfer.start();
      expect(transfer.state.current).to.equal('ongoing');
    });

    it("should trigger 1 byte chunks events until reaching the eof event", function(done) {
      var chunks = [];
      transfer.on("chunk", function(chunk) {
        chunks.push(chunk);
      });
      transfer.on("eof", function() {
        expect(chunks).to.deep.equal(['c', 'o', 'n', 't', 'e', 'n', 't']);
        done();
      });

      transfer.start();
    });

    it("should accepts a custom chunkSize", function(done) {
      var chunks = [];
      transfer.on("chunk", function(chunk) {
        chunks.push(chunk);
      });
      transfer.on("eof", function() {
        expect(chunks).to.deep.equal(['con', 'ten', 't']);
        done();
      });

      transfer.chunkSize = 3;
      transfer.start();
    });

    it("should call complete when there is not chunk left", function(done) {
      var chunks = [];
      transfer.on("chunk", function(chunk) {
        chunks.push(chunk);
      });
      sandbox.stub(transfer, "complete", function() {
        expect(chunks).to.deep.equal(['c', 'o', 'n', 't', 'e', 'n', 't']);
        done();
      });

      transfer.start();
    });

  });

  describe("#complete", function() {

    it("should change the state from ongoing to completed", function() {
      transfer.state.start();
      transfer.complete();
      expect(transfer.state.current).to.equal('completed');
    });

  });

  describe("#_onProgress", function() {

    it("should update the progress attribute via a voodoo equation", function() {
      transfer.seek = 6;
      transfer._onProgress();

      expect(transfer.file.size).to.equal(7); // size of the blob
      expect(transfer.get("progress")).to.equal(85); // percentage of progress
    });
  });

});
