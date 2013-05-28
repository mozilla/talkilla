/* global app, Backbone, StateMachine */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone, StateMachine) {
  "use strict";

  app.models.Call = Backbone.Model.extend({
    initialize: function() {
      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          // Call initiation scenario
          {name: 'start',     from: 'ready',   to: 'pending'},
          {name: 'establish', from: 'pending', to: 'ongoing'},

          // Incoming call scenario
          {name: 'incoming',  from: 'ready',   to: 'pending'},
          {name: 'accept',    from: 'pending', to: 'ongoing'}
        ]
      });

      this.start     = this.state.start.bind(this.state);
      this.incoming  = this.state.incoming.bind(this.state);
      this.accept    = this.state.accept.bind(this.state);
      this.establish = this.state.establish.bind(this.state);
    }
  });

  app.models.IncomingCall = Backbone.Model.extend({
    defaults: {callee: undefined,
               caller: undefined,
               offer: {}}
  });

  app.models.PendingCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
  });

  app.models.DeniedCall = Backbone.Model.extend({
    defaults: {callee: undefined, caller: undefined}
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

    constructor: function() {
      Backbone.Collection.apply(this, arguments);
      // register the talkilla.text-message event
      app.port.on('talkilla.text-message', function(entry) {
        this.add(entry);
      }.bind(this));
    }
  });

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined, presence: "disconnected"},

    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('nick') !== undefined;
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
