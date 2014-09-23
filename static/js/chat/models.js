/*global app, StateMachine, tnetbin, WebRTC, SPAChannel */
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
  app.models.Call = app.models.BaseModel.extend({
    dependencies: {
      media: WebRTC,
      peer: app.models.User
    },

    defaults: {
      currentConstraints: {video: false, audio: false},
      incomingData:       {}
    },

    callid: undefined,
    timer: undefined,

    /**
     * Call model constructor.
     * @param  {Object}     attributes  Model attributes
     * @param  {Object}     options     Model options
     */
    initialize: function(attributes) {
      this.set(attributes || {});
      this.callid = app.utils.id();

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

          // Incoming call scenario
          {name: 'incoming',  from: ['ready',
                                     'timeout'], to: 'incoming'},
          {name: 'accept',    from: 'incoming',  to: 'pending'},
          {name: 'ignore',    from: 'incoming',  to: 'terminated'},
          {name: 'complete',  from: 'pending',   to: 'ongoing'},

          // Call actions
          // For call hold, it is expected that there may be a future
          // attribute for which side of the connection initiated the
          // hold. For now, we only support hold for an incoming request.
          {name: 'hold', from: 'ongoing', to: 'hold'},
          {name: 'resume', from: 'hold', to: 'ongoing'},

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
      this.callid = app.utils.id();
      this.set('currentConstraints', constraints);

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
        this.trigger("send-offer", new app.payloads.Offer({
          peer: this.peer.get("username"),
          offer: offer,
          callid: this.callid
        }));
      }, this);

      if (this.media.state.current === 'ongoing')
        this.media.upgrade(constraints);
      else
        this.media.initiate(constraints);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {payloads.Offer} the received offer
     */
    incoming: function(offerMsg) {
      // The order of arguments is important to avoid modifying the
      // offerMsg and upsetting unit tests
      var options = _.extend({
        offer: offerMsg.offer
      }, new WebRTC.SDP(offerMsg.offer.sdp).constraints);

      this.set('incomingData', options);
      this.callid = offerMsg.callid;

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
      this.trigger("send-timeout", new app.payloads.Hangup({
        peer: this.peer.get("username"),
        callid: this.callid
      }));
    },

    /**
     * Accepts a pending incoming call.
     */
    accept: function() {
      var data = this.get('incomingData');

      this.media.once("answer-ready", function(answer) {
        this.trigger("send-answer", new app.payloads.Answer({
          peer: this.peer.get("username"),
          answer: answer
        }));

        // XXX Change transition to complete/ongoing here as
        // this is the best place we've got currently to know that
        // the incoming call is now ongoing. When WebRTC platform
        // support comes for connection notifications, we'll want
        // to handle this differently.
        this.state.complete();
      }, this);

      if (this.media.state.current === 'ongoing')
        this.media.upgrade(null, data && data.offer);
      else
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
        this.trigger("send-hangup", new app.payloads.Hangup({
          peer: this.peer.get("username"),
          callid: this.callid
        }));
      }
    },

    move: function() {
      this.trigger("initiate-move", new app.payloads.Move({
        peer: this.peer.get("username"),
        callid: this.callid
      }));
    },

    /**
     * Used to place a call on hold.
     */
    hold: function() {
      this.state.hold();
      // XXX Whilst we don't have session renegotiation which would
      // remove the streams, we must mute the outgoing audio & video.
      this.media.setMuteState('local', 'both', true);
    },

    /**
     * Resume a call after a hold.
     *
     * @param {Boolean} enableVideoStream set to true to re-enable the
     * video stream if it was enabled before the hold
     */
    resume: function(enableVideoStream) {
      // Note: We set the mute status and constraints before changing the
      // state of the model, to ensure that the views are updated cleanly.
      if (this.state.current !== "hold")
        throw new Error("Cannot resume a call that isn't on hold.");

      // XXX Whilst we don't have session renegotiation which would
      // add the streams, we must unmute the outgoing audio & video.

      if (!this.requiresVideo()) {
        // If the original constraints were audio only then we can just
        // re-enable the audio stream.
        this.media.setMuteState('local', 'audio', false);
      }
      else {
        if (!enableVideoStream) {
          // Although this call still has video muted in the background
          // update the constraints so that the views can get the correct
          // state for determining if to display video or not.
          var constraints = this.get('currentConstraints');
          constraints.video = false;
          this.set('currentConstraints', constraints);

          this.media.setMuteState('local', 'audio', false);
        }
        else
          this.media.setMuteState('local', 'both', false);
      }

      this.state.resume();
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

      this.fullName = attributes.fullName;
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
        fullName: this.fullName,
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
      this.reader.readAsBinaryString(blob);
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

      this.seek += data.length;
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
    defaults: {
      fullName: undefined,
      message: undefined,
      date: new Date().getTime()
    }
  });

  app.models.TextChat = app.models.BaseCollection.extend({
    dependencies: {
      media: WebRTC,
      user: app.models.User,
      peer: app.models.User
    },

    model: app.models.TextChatEntry,

    transport: undefined,
    typingTimeout: undefined,

    initialize: function(attributes, options) {
      this.typeTimeout = options && options.typeTimeout || 5000;
      this.callid = app.utils.id(); // XXX add  a test

      this.on('add', this._onTextChatEntryCreated, this);
      this.on('add', this._onFileTransferCreated, this);
      this.on('transport', this.setTransport, this);
      this.media.on('transport-created', this.trigger.bind(this, "transport"));
    },

    setTransport: function(transport) {
      this.transport = transport;
      this.transport.on('message', this._onMessage, this);
      this.transport.on('close', function() {
        this.transport = undefined;
      }.bind(this));
    },

    initiate: function(constraints) {
      this.media.once("offer-ready", function(offer) {
        this.trigger("send-offer", new app.payloads.Offer({
          callid: this.callid,
          peer: this.peer.get("username"),
          offer: offer
        }));
      }, this);

      this.media.initiate(constraints);
    },

    answer: function(offer) {
      this.media.once("answer-ready", function(answer) {
        this.trigger("send-answer", new app.payloads.Answer({
          peer: this.peer.get("username"),
          answer: answer
        }));
      }, this);

      this.media.answer(offer);
    },

    establish: function(answer) {
      this.media.establish(answer);
    },

    /**
     * Sends an entry over the transport, initiating the transport if
     * necessary.
     * @param  {Object} entry
     */
    send: function(entry) {
      if (!(this.transport instanceof SPAChannel) &&
          this.media.state.current === "ready")
        this.initiate({video: false, audio: false});

      this.transport.send(entry);
    },

    notifyTyping: function() {
      if (!this.length ||
          !(this.transport instanceof SPAChannel) &&
          this.media.state.current !== "ongoing")
        return;

      this.transport.send({
        type: "chat:typing",
        message: {}
      });
    },

    _onMessage: function(event) {
      var transfer;

      switch (event.type) {
      case "chat:message":
        this.add(new app.models.TextChatEntry({
          fullName: this.peer.get("fullName"),
          message: event.message
        }));
        this.trigger("chat:type-stop");
        break;
      case "chat:typing":
        this.trigger("chat:type-start");
        if (this.typingTimeout)
          clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(
          this.trigger.bind(this, "chat:type-stop"), this.typeTimeout);
        break;
      case "file:new":
        var fullName = this.peer.get("fullName");
        var message = _.extend({fullName: fullName}, event.message);
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
      default:
        console.error("Unsupport chat message of type: " + event.type);
        break;
      }
    },

    _onTextChatEntryCreated: function(entry) {
      // Send the message if we are the sender.
      // If we are not, the message comes from a contact and we do not
      // want to send it back.
      if (entry instanceof app.models.TextChatEntry &&
          entry.get('fullName') === this.user.get("fullName"))
        this.send({type: "chat:message", message: entry.get("message")});
    },

    _onFileTransferCreated: function(entry) {
      // Only process outgoing file transfers
      if (!(entry instanceof app.models.FileTransfer && !entry.get('incoming')))
        return;

      var onFileChunk = this._onFileChunk.bind(this, entry);
      this.send({type: "file:new", message: {
        id: entry.id,
        filename: entry.file.name,
        size: entry.file.size,
        type: entry.file.type
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

