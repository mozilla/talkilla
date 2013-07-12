/* global app, Backbone, StateMachine */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine, tnetbin) {
  "use strict";

  /**
   * Call model.
   *
   * Attributes:
   * - {Object} incomingData
   *
   * Fired when #start() is called and the pending call timeout is reached with
   * no response from the other side.
   * @event offer-timeout
   * @param {Object} options An object containing one attribute, peer, with
   *                         the value as the peer's nick.
   */
  app.models.Call = Backbone.Model.extend({
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
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',     to: 'pending'},
          {name: 'establish', from: 'pending',   to: 'ongoing'},
          {name: 'upgrade',   from: ['ready',
                                     'ongoing'], to: 'pending'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',     to: 'incoming'},
          {name: 'accept',    from: 'incoming',  to: 'pending'},
          {name: 'ignore',    from: 'incoming',  to: 'terminated'},
          {name: 'complete',  from: 'pending',   to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',         to: 'terminated'}
        ],
        callbacks: {
          onenterstate: function(event, from, to) {
            this.trigger("change:state", to, from, event);
            this.trigger("state:" + event);
            this.trigger("state:to:" + to);
          }.bind(this)
        }
      });
    },

    /**
     * Starts an outbound call.
     *
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     */
    start: function(options) {
      this._startTimer({
        timeout: app.options.PENDING_CALL_TIMEOUT
      });

      this.state.start();

      this.media.once("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer
        });
      }, this);

      this.media.initiate(options);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {Object} options object containing:
     *
     * - video:   set to true to enable video
     * - audio:   set to true to enable audio
     * - offer:   information for the media object
     * - upgrade: is it a connection upgrade?
     *
     * Other items may be set according to the requirements for the particular
     * media.
     */
    incoming: function(options) {
      this.set({
        incomingData: options
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

      clearTimeout(this.timer);

      this.media.once('connection-established', this.state.establish,
                                                this.state);
      this.media.establish(answer);
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
     * Hangs up a call
     */
    hangup: function() {
      clearTimeout(this.timer);
      this.state.hangup();
      this.media.terminate();
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
     * Starts the outgoing pending call timer.
     * @param {Object} options:
     *      - {Number} timeout   Timeout in ms
     *      - {Object} callData  Current outgoing pending call data
     */
    _startTimer: function(options) {
      if (!options || !options.timeout)
        return;

      var onTimeout = function() {
        this.trigger('offer-timeout', {peer: this.peer.get("nick")});
      }.bind(this);

      this.timer = setTimeout(onTimeout, options.timeout);
    }
  });

  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message"}
  });

  app.models.TextChatEntry = Backbone.Model.extend({
    defaults: {nick: undefined,
               message: undefined,
               date: new Date().getTime()}
  });

  app.models.TextChat = Backbone.Collection.extend({
    model: app.models.TextChatEntry,

    media: undefined,
    peer: undefined,

    initialize: function(attributes, options) {
      if (!options || !options.media)
        throw new Error('TextChat model needs a `media` option');
      if (!options || !options.peer)
        throw new Error('TextChat model needs a `peer` option');

      this.media = options && options.media;
      this.peer = options && options.peer;

      this.media.on('dc:message-in', this._onDcMessageIn.bind(this));
      this.on('add', this._onTextChatEntryCreated.bind(this));
      this.on('add', this._onFileTransferCreated.bind(this));

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
      var entry;

      if (event.type === "chat:message")
        entry = new app.models.TextChatEntry(event.message);
      else if (event.type === "file:new")
        entry = new app.models.FileTransfer(event.message);
      else if (event.type === "file:chunk") {
        var chunk = tnetbin.toArrayBuffer(event.message.chunk).buffer;
        var transfer = this.findWhere({id: event.message.id});
        transfer.append(chunk);
      }

      this.add(entry);
    },

    _onTextChatEntryCreated: function(entry) {
      // Send the message if we are the sender.
      // I we are not, the message comes from a contact and we do not
      // want to send it back.
      if (entry instanceof app.models.TextChatEntry &&
          entry.get('nick') === app.data.user.get("nick"))
        this.send({type: "chat:message", message: entry.toJSON()});
    },

    _onFileTransferCreated: function(entry) {
      // Check if we are the file sender. If we are not, the file
      // transfer has been initiated by the other party.
      if (!(entry instanceof app.models.FileTransfer && entry.file))
        return;

      var onFileChunk = this._onFileChunk.bind(this);
      this.send({type: "file:new", message: {
        id: entry.id,
        filename: entry.file.name,
        size: entry.file.size
      }});

      entry.on("chunk", onFileChunk);
      entry.on("complete", entry.off.bind(this, "chunk", onFileChunk));

      entry.start();
    },

    _onFileChunk: function(id, chunk) {
      this.send({type: "file:chunk", message: {id: id, chunk: chunk}});
    }
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined,
               avatar: "img/default-avatar.png",
               presence: "disconnected"},

    initialize: function() {
      // If the user has signed in or out, trigger the appropraite
      // change
      this.on("change", function() {
        if (this.isLoggedIn() && !this.wasLoggedIn())
          this.trigger('signin');
        else if (!this.isLoggedIn() && this.wasLoggedIn())
          this.trigger('signout');
      }.bind(this));
    },

    /**
     * Returns true if the user is logged in.
     */
    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('nick') !== undefined;
    },

    /**
     * Returns true if the user was logged in prior to the last change
     * on the model. Returns false if there have been no changes.
     */
    wasLoggedIn: function() {
      return this.previous('presence') !== "disconnected" &&
        this.previous('nick') !== undefined;
    }
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User,

    initialize: function(models, options) {
      this.models = models || [];
      this.options = options;
      // register the talkilla.users event
      app.port.on('talkilla.users', function(users) {
        this.reset(users);
      }.bind(this));
    }
  });
})(app, Backbone, StateMachine);
