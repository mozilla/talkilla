/* global app, Backbone, _ */
/**
 * ChatApp models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.FileTransfer = Backbone.Model.extend({

    initialize: function(attributes, options) {
      this.options = options;
      this.id = this.set("id", _.uniqueId()).id;

      if (attributes.file) {
        this.file          = attributes.file;
        this.filename      = attributes.file.name;
        this.size          = attributes.file.size;
        this.reader        = new FileReader();
        this.reader.onload = this._onChunk.bind(this);
      } else {
        this.size          = attributes.size;
        this.filename      = attributes.filename;
        this.chunks        = [];
      }

      this.seek = 0;
      this.on("chunk", this._onProgress, this);
    },

    toJSON: function() {
      var progress = this.get("progress");
      var json = {
        filename: this.filename,
        progress: progress || 0
      };

      if (progress === 100)
        json.url = window.URL.createObjectURL(this.blob || this.file);

      return json;
    },

    start: function() {
      this._readChunk();
    },

    append: function(chunk) {
      this.chunks.push(chunk);
      this.seek += chunk.byteLength;

      if (this.seek === this.size) {
        this.blob = new Blob(this.chunks);
        this.trigger("complete", this.blob);
      }
      this.trigger("chunk", this.id, chunk);

      if (this.seek > this.size)
        throw new Error("Received more data than expected: " +
                        this.seek + " instead of " + this.size);
    },

    _onChunk: function(event) {
      var data = event.target.result;

      this.seek += data.byteLength;
      this.trigger("chunk", this.id, data);

      if (this.seek < this.file.size)
        this._readChunk();
      else
        this.trigger("complete", this.file);

    },

    _onProgress: function() {
      var progress = Math.floor(this.seek * 100 / this.size);
      this.set("progress", progress);
    },

    _readChunk: function() {
      var blob = this.file.slice(this.seek, this.seek + this.options.chunkSize);
      this.reader.readAsArrayBuffer(blob);
    }
  });
})(app, Backbone);

