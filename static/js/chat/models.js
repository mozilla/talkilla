/* global app, Backbone */
/**
 * ChatApp models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.FileTransfer = Backbone.Model.extend({

    initialize: function(attributes, options) {
      this.file = attributes.file;
      this.chunkSize = options.chunkSize;
      this.reader = new FileReader();
      this.seek = 0;

      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          {name: 'start',    from: 'ready',   to: 'ongoing'},
          {name: 'complete', from: 'ongoing', to: 'completed'}
        ]
      });

      this.complete = this.state.complete.bind(this.state);
      this.reader.onload = this._onChunk.bind(this);

      this.on("chunk", this._onProgress, this);
    },

    toJSON: function() {
      return {
        filename: this.file.name,
        progress: this.get("progress")
      };
    },

    start: function() {
      this.state.start();
      this._readChunk();
    },

    _onChunk: function(event) {
      var data = event.target.result;

      this.seek += 1;
      this.trigger("chunk", data);

      if (this.seek < this.file.size) {
        this._readChunk();
      } else {
        this.trigger("eof");
        this.complete();
      }
    },

    _onProgress: function() {
      var progress = Math.floor(this.seek * 100 / this.file.size);
      this.set("progress", progress);
    },

    _readChunk: function() {
      var blob = this.file.slice(this.seek, this.seek + 1);
      this.reader.readAsBinaryString(blob);
    }
  });
})(app, Backbone);

