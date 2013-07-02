/* global app, chai, describe, it, sinon, beforeEach, afterEach */

/* jshint expr:true */
var expect = chai.expect;

describe("FileTransfer", function() {

  var sandbox, transfer, incomingTransfer, blob;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    blob = new Blob(['content'], {type: 'plain/text'})
    transfer = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
    incomingTransfer = new app.models.FileTransfer({filename: "foo", size: 10});
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

    it("shoud have a filename attribute", function() {
      expect(incomingTransfer.filename).to.equal("foo");
    });

    it("shoud have a size attribute", function() {
      expect(incomingTransfer.size).to.equal(10);
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
      transfer.on("complete", function() {
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
      transfer.on("complete", function() {
        expect(chunks).to.deep.equal(['con', 'ten', 't']);
        done();
      });

      transfer.options.chunkSize = 3;
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

  describe("#incoming", function() {

    it("should change the state from ready to ongoing", function() {
      transfer.incoming();
      expect(transfer.state.current).to.equal('ongoing');
    });

  });

  describe("#complete", function() {

    it("should change the state from ongoing to completed", function() {
      transfer.state.start();
      transfer.complete();
      expect(transfer.state.current).to.equal('completed');
    });

  });

  describe("#toJSON", function() {

    it("should have a progress of 0 by default", function() {
      expect(transfer.toJSON().progress).to.equal(0);
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

  describe("#append", function() {

    it("should trigger a chunk event", function(done) {
      incomingTransfer.incoming();
      incomingTransfer.on("chunk", function(c) {
        expect(c).to.equal("chunk");
        done();
      });
      incomingTransfer.append("chunk");
    });

    it("should call complete when reaching the file size", function(done) {
      var reader = new FileReader();
      incomingTransfer.incoming();

      reader.onload = function(event) {
        var data = event.target.result;
        expect(data).to.equal("abcdefghij");
        done();
      };

      incomingTransfer.on("complete", function(file) {
        reader.readAsBinaryString(file);
      });

      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].forEach(function(c) {
        incomingTransfer.append(c);
      });
    });

  });

});
