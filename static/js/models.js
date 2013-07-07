/* global app, Backbone, StateMachine */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine) {
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
   * @param {Object} options Current call start options (see #start)
   */
  app.models.Call = Backbone.Model.extend({
    timer: undefined,
    media: undefined,

    /**
     * Call model constructor.
     * @param  {Object}  attributes  Model attributes
     * @param  {Object}  options     Model options
     *
     * Options:
     * - {app.models.WebRTCCall}  media      Media object
     */
    initialize: function(attributes, options) {
      this.set(attributes || {});

      this.media = options && options.media;
      this.peer = options && options.peer;

      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',    to: 'pending'},
          {name: 'establish', from: 'pending',  to: 'ongoing'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',    to: 'incoming'},
          {name: 'accept',    from: 'incoming', to: 'pending'},
          {name: 'ignore',    from: 'incoming', to: 'terminated'},
          {name: 'complete',  from: 'pending',  to: 'ongoing'},

          // Call hangup
          {name: 'hangup',    from: '*',        to: 'terminated'}
        ],
        callbacks: {
          onenterstate: function(event, from, to) {
            this.trigger("change:state", to, from, event);
            this.trigger("state:" + event);
            this.trigger("state:to:" + to);
          }.bind(this)
        }
      });

      this.media.on("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer
        });
      }.bind(this));

      this.media.on("answer-ready", function(answer) {
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
      }.bind(this));
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
        callData: options,
        timeout: app.options.PENDING_CALL_TIMEOUT
      });
      this.state.start();
      this.media.initiate(options);
    },

    /**
     * Starts a call based on an incoming call request
     * @param {Object} options object containing:
     *
     * - video: set to true to enable video
     * - audio: set to true to enable audio
     * - offer: information for the media object
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
      clearTimeout(this.timer);
      this.state.establish();
      this.media.establish(options.answer);
    },

    /**
     * Accepts a pending incoming call.
     */
    accept: function() {
      var data = this.get('incomingData');
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
     * Starts the outgoing pending call timer.
     * @param {Object} options:
     *      - {Number} timeout   Timeout in ms
     *      - {Object} callData  Current outgoing pending call data
     */
    _startTimer: function(options) {
      if (!options || !options.timeout)
        return;

      var onTimeout = function() {
        this.trigger('offer-timeout', options.callData);
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

      this.media.on("offer-ready", function(offer) {
        this.trigger("send-offer", {
          peer: this.peer.get("nick"),
          offer: offer,
          dataChannel: true
        });
      }, this);

      this.media.on("answer-ready", function(answer) {
        this.trigger("send-answer", {
          peer: this.peer.get("nick"),
          answer: answer,
          dataChannel: true
        });
      }, this);

      this.media.on('dc.in.message', function(event) {
        this.add(JSON.parse(event.data));
      }, this);
    },

    incoming: function(options) {
      this.media.answer(options);
    },

    /**
     * Establish communication through data channel.
     * @param  {Object} options
     */
    establish: function(options) {
      this.media.establish(options);
    },

    /**
     * Adds a new entry to the collection and sends it over data channel.
     * TODO: send entry over data channel
     * @param  {Object} data
     */
    send: function(data) {
      var entry = this.add(data).at(this.length - 1);
      if (entry)
        this.media.send(entry.toJSON());
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
