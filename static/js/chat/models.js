/* global app, Backbone */
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
      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          {name: 'start',    from: 'ready',   to: 'ongoing'},
          {name: 'incoming', from: 'ready',   to: 'ongoing'},
          {name: 'complete', from: 'ongoing', to: 'completed'}
        ]
      });

      this.state.oncomplete = this._onComplete.bind(this);
      this.incoming = this.state.incoming.bind(this.state);
      this.complete = this.state.complete.bind(this.state);

      this.on("chunk", this._onProgress, this);
    },

    toJSON: function() {
      return {
        filename: this.filename,
        progress: this.get("progress") || 0
      };
    },

    start: function() {
      this.state.start();
      this._readChunk();
    },

    append: function(chunk) {
      this.chunks.push(chunk);
      this.seek += chunk.length;
      this.trigger("chunk", this.id, chunk);

      if (this.seek === this.size) {
        this.blob = new Blob(this.chunks);
        this.trigger("complete", this.blob);
      }

      if (this.seek > this.size)
        throw Error("Received more data than expected: " +
                    this.seek + " instead of " + this.size);
    },

    _onChunk: function(event) {
      var data = event.target.result;

      this.seek += data.length;
      this.trigger("chunk", this.id, data);

      if (this.seek < this.file.size)
        this._readChunk();
      else
        this.complete();
    },

    _onProgress: function() {
      var progress = Math.floor(this.seek * 100 / this.size);
      this.set("progress", progress);
    },

    _onComplete: function() {
      this.trigger("complete");
    },

    _readChunk: function() {
      var blob = this.file.slice(this.seek, this.seek + this.options.chunkSize);
      this.reader.readAsBinaryString(blob);
    }
  });
})(app, Backbone);

