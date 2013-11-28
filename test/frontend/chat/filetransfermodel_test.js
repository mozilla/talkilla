/*global app, chai, sinon */
/* jshint expr:true */
"use strict";

var expect = chai.expect;

describe("FileTransfer Model", function() {
  var sandbox, transfer, incomingTransfer, blob;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    blob = new Blob(['content'], {type: 'plain/text'});
    transfer = new app.models.FileTransfer({file: blob}, {chunkSize: 1});
    incomingTransfer = new app.models.FileTransfer({filename: "foo", size: 10});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe("#initialize", function() {

    it("should have a 'id' property", function() {
      expect(transfer.id).to.not.be.Null;
    });

    it("should have a 'file' property", function() {
      expect(transfer.file).to.equal(blob);
    });

    it("shoud have a 'filename' property", function() {
      expect(incomingTransfer.filename).to.equal("foo");
    });

    it("shoud have a 'size' property", function() {
      expect(incomingTransfer.size).to.equal(10);
    });

    it("shoud have a 'progress' attribute", function() {
      expect(incomingTransfer.get('progress')).to.equal(0);
      expect(transfer.get('progress')).to.equal(0);
    });

    it("shoud have a 'incoming' attribute", function() {
      expect(incomingTransfer.get('incoming')).to.equal(true);
      expect(transfer.get('incoming')).to.equal(false);
    });

    it("should bind _onProgress to the chunk event", function() {
      sandbox.stub(app.models.FileTransfer.prototype, "_onProgress");
      transfer = new app.models.FileTransfer({file: blob}, {chunkSize: 1});

      transfer.trigger("chunk");

      sinon.assert.calledOnce(transfer._onProgress);
    });

  });

  describe("#toJSON", function() {

    it("should have a progress of 0 by default", function() {
      expect(transfer.toJSON().progress).to.equal(0);
    });

    it("should compute the value for incoming", function() {
      expect(transfer.toJSON().incoming).to.equal(false);
      expect(incomingTransfer.toJSON().incoming).to.equal(true);
    });

  });

  describe("#chunk", function() {

    it("should trigger a 1 byte chunk event",
      function(done) {
        var nbCalls = 1;
        transfer.on("chunk", function(id, chunk) {
          var view = new Uint8Array(chunk);
          var c = String.fromCharCode.apply(null, view);

          expect(id).to.not.be.Null;

          if (nbCalls === 1) {
            expect(c).to.equal('c');
            transfer.nextChunk();
          }

          if (nbCalls === 2) {
            expect(c).to.equal('o');
            done();
          }

          nbCalls += 1;
        });

        transfer.nextChunk();
      });

    it("should accepts a custom chunkSize", function(done) {
      var chunks = [];
      transfer.on("chunk", function(id, chunk) {
        var view = new Uint8Array(chunk);
        var str = String.fromCharCode.apply(null, view);

        chunks.push(str);
        if (!transfer.isDone())
          transfer.nextChunk();
      });
      transfer.on("complete", function() {
        expect(chunks).to.deep.equal(['con', 'ten', 't']);
        done();
      });

      transfer.options.chunkSize = 3;
      transfer.nextChunk();
    });

    it("should call complete when there are no chunks left", function(done) {
      var chunks = [];
      transfer.on("chunk", function(id, chunk) {
        var view = new Uint8Array(chunk);
        var str = String.fromCharCode.apply(null, view);

        chunks.push(str);
        if (!transfer.isDone())
          transfer.nextChunk();
      });
      transfer.on("complete", function() {
        expect(chunks).to.deep.equal("content".split(""));
        done();
      });

      transfer.nextChunk();
    });
  });

  describe("#_onProgress", function() {

    it("should update the progress attribute via a voodoo equation",
      function() {
        transfer.seek = 6;
        transfer._onProgress();

        expect(transfer.file.size).to.equal(7); // size of the blob
        expect(transfer.get("progress")).to.equal(85); // percentage of progress
      });

  });

  describe("#append", function() {

    it("should trigger a chunk event", function(done) {
      incomingTransfer.on("chunk", function(id, c) {
        expect(id).to.not.be.Null;
        expect(c).to.equal("chunk");
        done();
      });
      incomingTransfer.append("chunk");
    });

    it("should call complete when reaching the file size", function(done) {
      var reader = new FileReader();

      reader.onload = function(event) {
        var data = event.target.result;
        expect(data).to.equal("abcdefghij");
        done();
      };

      incomingTransfer.on("complete", function(blob) {
        reader.readAsBinaryString(blob);
      });

      ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].forEach(function(c) {
        var view = new Uint8Array(new ArrayBuffer(1));
        view[0] = c.charCodeAt(0);
        incomingTransfer.append(view);
      });
    });

  });

  describe("#done", function() {

    it("should return true if the transfer is done", function() {
      transfer.seek = transfer.size;
      expect(transfer.isDone()).to.equal(true);
    });

    it("should return false if the transfer is not done", function() {
      transfer.seek = transfer.size - 1;
      expect(transfer.isDone()).to.equal(false);
    });

  });

});
