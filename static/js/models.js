/* global Talkilla, Backbone, StateMachine */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  app.models.Call = Backbone.Model.extend({
    initialize: function() {
      this.state = StateMachine.create({
        initial: 'ready',
        events: [
          {name: 'start',  from: 'ready',   to: 'pending'},
          {name: 'accept', from: 'pending', to: 'ongoing'},
          {name: 'hangup', from: '*',       to: 'terminated'}
        ]
      });

      this.start = this.state.start.bind(this.state);
      this.accept = this.state.accept.bind(this.state);
      this.hangup = this.state.hangup.bind(this.state);
    },

    _onHangup: function(media) {
      media.closePeerConnection();
      this._pc = null;
      this.callee = null;
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

  app.models.User = Backbone.Model.extend({
    defaults: {nick: undefined}
  });

  app.models.UserSet = Backbone.Collection.extend({
    model: app.models.User
  });
})(Talkilla, Backbone, StateMachine);
