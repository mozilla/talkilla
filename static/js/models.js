/* global Talkilla, Backbone, StateMachine */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  var portListener;

  /**
   * Retrieves or initializes a PortListener object.
   * @return {PortListener}
   */
  app.models.getPortListener = function() {
    var port;
    if (portListener)
      return portListener;
    try {
      port = navigator.mozSocial.getWorker().port;
    } catch (e) {
      return;
    }
    return new app.models.PortListener(port);
  };

  /**
   * MozSocial Port listener.
   * @param  {AbstractPort} port
   */
  app.models.PortListener = function(port) {
    this.port = port;
    this.listeners = {};
    this.port.onmessage = this.onmessage.bind(this);
  };

  app.models.PortListener.prototype = {
    /**
     * Adds a topic listener.
     * @param  {String}   topic
     * @param  {Function} listener
     */
    on: function(topic, listener) {
      if (!(topic in this.listeners)) {
        this.listeners[topic] = [];
      }
      this.listeners[topic].push(listener);
    },

    /**
     * Port message event listener, will call every registered listener for the
     * received topic.
     * @param  {Event} event
     */
    onmessage: function(event) {
      var topic = event.data.topic;
      var data = event.data.data;
      Object.keys(this.listener).forEach(function(registered) {
        if (topic === registered)
          this.listeners.forEach(function(listener) {
            listener.call(this, data);
          });
      });
    }
  };

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

    _pc: null,
    _localStream: null,
    _remoteStream: null,

    _onHangup: function(media) {
      media.closePeerConnection(this._pc, this._localStream,
        this._remoteStream);
      this._pc = null;
      this._remoteStream = null;
      this._localStream = null;
      this.callee = null;
      app.trigger('hangup_done');
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
    model: app.models.User,

    initialize: function(models, options) {
      this.models = models;
      this.options = options;
      // register the talkilla.users event
      app.models.getPortListener().on('talkilla.users', function(users) {
        this.reset(users);
      }.bind(this));
    }
  });
})(Talkilla, Backbone, StateMachine);
