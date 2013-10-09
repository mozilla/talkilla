/*global app, StateMachine, tnetbin */
/**
 * ChatApp models and collections.
 */
(function(app, Backbone, StateMachine, tnetbin) {
  "use strict";

  /**
   * Call model.
   *
   * Attributes:
   * - {Object} incomingData
   */
  app.models.Call = Backbone.Model.extend({
    defaults: {
      currentConstraints: {video: false, audio: false},
      incomingData:       {}
    },
    timer: undefined,
    media: undefined,

    /**
     * Call model constructor.
     * @param  {Object}     attributes  Model attributes
     * @param  {Object}     options     Model options
     *
     * Options:
     *
     * - {WebRTC}           media       Media object
     * - {app.models.User}  peer        The peer for the conversation
     */
    initialize: function(attributes, options) {
      this.set(attributes || {});

      this.media = options && options.media;
      this.peer = options && options.peer;

      this.state = StateMachine.create({
        initial: 'ready',
        // XXX This state machine needs refactoring to separate out
        // the pending state into two states: one for incoming, one
        // for outgoing. When this is done,
        // app.views.CallEstablishView._handleStateChanges needs
        // re-auditing.
        events: [
          // Call initiation scenario
          {name: 'start',     from: ['ready',
                                     'timeout'], to: 'pending'},
          {name: 'establish', from: 'pending',   to: 'ongoing'},
          {name: 'timeout',   from: 'pending',   to: 'timeout'},
          {name: 'upgrade',   from: ['ready',
                                     'ongoing'], to: 'pending'},

          // Incoming call scenario
          {name: 'incoming',  from: ['ready',
                                     'timeout'], to: 'incoming'},
          {name: 'accept',    from: 'incoming',  to: 'pending'},
          {name: 'ignore',    from: 'incoming',  to: 'terminated'},
          {name: 'complete',  from: 'pending',   to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',         to: 'terminated'}
        ],
        callbacks: {
          onenterstate: function(event, from, to) {
            this.trigger("change:state", to, from, event);
            this.trigger("transition:" + event);
            this.trigger("state:to:" + to);
          }.bind(this)
        }
      });
    },

    /**
     * Starts or upgrade an outbound call.
     *
     * @param {Object} constraints object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    start: function(constraints) {
      this.set('currentConstraints', constraints);

      if (this.media.state.current === 'ongoing')
        return this.upgrade(constraints);

      this._startCall(this.get('currentConstraints'));
    },

    /**
     * Restarts an outbound call, constraints are re-used from the
     * previous call attempt.
     */
    restart: function() {
      this._startCall(this.get('currentConstraints'));
    },

    _startCall: function(constraints) {
      this.state.start();

      this.media.once("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer
        });
      }, this);

      this.media.initiate(constraints);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {Object} options object containing:
     *
     * - constraints: media constraints
     * - offer:       information for the media object
     * - upgrade:     is it a connection upgrade?
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    incoming: function(options) {
      this.set('incomingData', options);
      this.set('currentConstraints', {
        video: !!options.video,
        audio: !!options.audio
      });
      this.state.incoming();
    },

    /**
     * Completes the connection for an outbound call
     * @param {Object} options object containing:
     *
     * - answer: {Object} answer object
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    establish: function(options) {
      var answer = options && options.answer;
      if (!answer)
        throw new Error("Invalid answer, can't establish connection.");

      this.media.once('connection-established', this.state.establish,
                                                this.state);
      this.media.establish(answer);
    },

    /**
     * Indicate that a call connection has timed out
     */
    timeout: function() {
      this.state.timeout();
      this.media.terminate();
      this.media.reset();
      this.trigger("send-timeout", {
        peer: this.peer.get("nick")
      });
    },

    /**
     * Accepts a pending incoming call.
     */
    accept: function() {
      var data = this.get('incomingData');

      this.media.once("answer-ready", function(answer) {
        this.trigger("send-answer", {
          peer: this.peer.get("nick"),
          answer: answer
        });

        // XXX Change transition to complete/ongoing here as
        // this is the best place we've got currently to know that
        // the incoming call is now ongoing. When WebRTC platform
        // support comes for connection notifications, we'll want
        // to handle this differently.
        this.state.complete();
      }, this);

      this.media.answer(data && data.offer);

      this.state.accept();
    },

    /**
     * Ignores an incoming call.
     */
    ignore: function() {
      this.state.ignore();
    },

    /**
     * Hangs up a call if necessary, i.e. if the call state is in a place
     * where hangup needs to be sent.
     *
     * @param {Boolean} sendMsg Set to true if to trigger sending hangup
     *                          to the peer. This should be false in the
     *                          case of an incoming hangup message.
     */
    hangup: function(sendMsg) {
      if (this.state.current === "terminated" ||
          this.state.current === "timeout" ||
          this.state.current === "ready")
        return;

      this.state.hangup();
      this.media.terminate();

      if (sendMsg) {
        this.trigger("send-hangup", {
          peer: this.peer.get("nick")
        });
      }
    },

    /**
     * Upgrades ongoing call with new media constraints.
     *
     * @param {Object} constraints object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    upgrade: function(constraints) {
      this.state.upgrade();

      this.media.once("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer,
          textChat: false,
          upgrade: true
        });
      }, this);

      this.media.upgrade(constraints);
    },

    /**
     * Checks if current call has video constraints.
     * @return {Boolean}
     */
    requiresVideo: function() {
      return this.get('currentConstraints').video;
    }
  });

  /**
   * FileTransfer model.
   *
   * Attributes:
   * - {Integer} progress: percentage of ongoing file transfer progress
   * - {Boolean} incoming: determines if the file transfer is an incoming one
   *
   * Fired when a new chunk is available.
   * @event chunk
   * @param {String} id the id of the file transfer
   * @param {ArrayBuffer} chunk
   *
   * Fired when the transfer is complete.
   * @event complete
   * @param {File|Blob} file the file transfered
   *
   * Example:
   *
   * // Sender side
   * var transfer =
   *   new app.models.FileTransfer({file: file}, {chunkSize: 512 * 1024});
   * transfer.on("chunk", function(id, chunk) {
   *   sendChunk(id, chunk);
   *   if (!transfer.isDone())
   *     transfer.nextChunk();
   * });
   * transfer.nextChunk();
   *
   * // Receiver side
   * var transfer =
   *   new app.models.FileTransfer({filename: filename, size: size});
   * transfer.on("complete", function(blob) {
   *   window.URL.createObjectURL(blob);
   * });
   * transfer.append(chunk);
   * transfer.append(chunk);
   * transfer.append(chunk);
   * ...
   *
   */
  app.models.FileTransfer = Backbone.Model.extend({

    defaults: {progress: 0, incoming: false},

    /**
     * Filetransfer model constructor.
     * @param  {Object}  attributes  Model attributes
     * @param  {Object}  options     Model options
     *
     * Attributes:
     *
     * When initiating a file tranfer
     *
     * - {File} file The file to transfer
     *
     * When receiving a file transfer
     *
     * - {String} filename The name of the received file
     * - {Integer} size The size of the received file
     *
     * Options:
     *
     * When initiating a file tranfer
     *
     * - {Integer} chunkSize The size of the chunks
     *
     */
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

      this.nick = attributes.nick;
      this.set('incoming', !this.file);
      this.seek = 0;
      this.on("chunk", this._onProgress, this);
    },

    /**
     * Turns a FileTransfer object into a JSON ready object.
     *
     * @return {Object} the serializable object
     *
     * Return value:
     * - {String} filename The name of the file
     * - {Integer} progress The progress of the file transfer
     */
    toJSON: function() {
      var progress = this.get("progress");
      var json = {
        nick: this.nick,
        incoming: this.get('incoming'),
        filename: _.escape(this.filename),
        progress: progress,
        sent: this.seek,
        total: this.size
      };

      if (progress === 100)
        json.url = window.URL.createObjectURL(this.blob || this.file);

      return json;
    },

    /**
     * Start the file transfer.
     *
     * It actually trigger the file transfer to emit chunks one after
     * the other until the end of the file is reached.
     */
    nextChunk: function() {
      var blob = this.file.slice(this.seek, this.seek + this.options.chunkSize);
      this.reader.readAsArrayBuffer(blob);
    },

    /**
     * Append a chunk to the current file transfer.
     *
     * Accumulates the data until the transfer is complete.
     * Raise an error if we append more data than expected.
     *
     * @param {ArrayBuffer} chunk the chunk to append
     */
    append: function(chunk) {
      this.chunks.push(chunk);
      this.seek += chunk.byteLength;

      if (this.isDone()) {
        this.blob = new Blob(this.chunks);
        this.chunks = [];
        this.trigger("complete", this.blob);
      }
      this.trigger("chunk", this.id, chunk);

      if (this.seek > this.size)
        throw new Error("Received more data than expected: " +
                        this.seek + " instead of " + this.size);
    },

    isDone: function() {
      return this.seek === this.size;
    },

    _onChunk: function(event) {
      var data = event.target.result;

      this.seek += data.byteLength;
      this.trigger("chunk", this.id, data);

      if (this.isDone())
        this.trigger("complete", this.file);
    },

    _onProgress: function() {
      var progress = Math.floor(this.seek * 100 / this.size);
      this.set("progress", progress);
    }
  });

  app.models.TextChatEntry = Backbone.Model.extend({
    defaults: {nick: undefined,
               message: undefined,
               date: new Date().getTime()}
  });

  app.models.TextChat = Backbone.Collection.extend({
    model: app.models.TextChatEntry,

    media: undefined,
    user: undefined,
    peer: undefined,

    initialize: function(attributes, options) {
      if (!options || !options.media)
        throw new Error('TextChat model needs a `media` option');
      this.media = options.media;

      if (!options || !options.user)
        throw new Error('TextChat model needs a `user` option');
      this.user = options.user;

      if (!options || !options.peer)
        throw new Error('TextChat model needs a `peer` option');
      this.peer = options.peer;

      this.media.on('dc:message-in', this._onDcMessageIn, this);
      this.on('add', this._onTextChatEntryCreated, this);
      this.on('add', this._onFileTransferCreated, this);

      this.media.on('dc:close', function() {
        this.terminate().reset();
      });
    },

    initiate: function(constraints) {
      this.media.once("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer,
          textChat: true
        });
      }, this);

      this.media.initiate(constraints);
    },

    answer: function(offer) {
      this.media.once("answer-ready", function(answer) {
        this.trigger("send-answer", {
          peer: this.peer.get("nick"),
          answer: answer,
          textChat: true
        });
      }, this);

      this.media.answer(offer);
    },

    establish: function(answer) {
      this.media.establish(answer);
    },

    /**
     * Adds a new entry to the collection and sends it over data channel.
     * Schedules sending after the connection is established.
     * @param  {Object} entry
     */
    send: function(entry) {
      if (this.media.state.current === "ongoing")
        return this.media.send(entry);

      this.media.once("dc:ready", function() {
        this.send(entry);
      });

      if (this.media.state.current !== "pending")
        this.initiate({video: false, audio: false});
    },

    _onDcMessageIn: function(event) {
      var transfer;

      switch (event.type) {
      case "chat:message":
        this.add(new app.models.TextChatEntry(event.message));
        break;
      case "file:new":
        var nick = this.user.get("nick");
        var message = _.extend({nick: nick}, event.message);
        this.add(new app.models.FileTransfer(message));
        break;
      case "file:chunk":
        var chunk = tnetbin.toArrayBuffer(event.message.chunk).buffer;
        transfer = this.findWhere({id: event.message.id});
        transfer.append(chunk);
        this.send({type: "file:ack", message: {id: event.message.id}});
        break;
      case "file:ack":
        transfer = this.findWhere({id: event.message.id});
        if (!transfer.isDone())
          transfer.nextChunk();
        break;
      }
    },

    _onTextChatEntryCreated: function(entry) {
      // Send the message if we are the sender.
      // I we are not, the message comes from a contact and we do not
      // want to send it back.
      if (entry instanceof app.models.TextChatEntry &&
          entry.get('nick') === this.user.get("nick"))
        this.send({type: "chat:message", message: entry.toJSON()});
    },

    _onFileTransferCreated: function(entry) {
      // Only process outgoing file transfers
      if (!(entry instanceof app.models.FileTransfer && !entry.get('incoming')))
        return;

      var onFileChunk = this._onFileChunk.bind(this, entry);
      this.send({type: "file:new", message: {
        id: entry.id,
        filename: entry.file.name,
        size: entry.file.size
      }});

      entry.on("chunk", onFileChunk);
      entry.on("complete", entry.off.bind(this, "chunk", onFileChunk));
      entry.nextChunk();
    },

    _onFileChunk: function(transfer, id, chunk) {
      this.send({type: "file:chunk", message: {id: id, chunk: chunk}});
    }

  });
})(app, Backbone, StateMachine, tnetbin);

