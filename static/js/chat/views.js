/* global app, Backbone, _, jQuery */
/**
 * Talkilla Backbone views.
 */
/* jshint unused: vars */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * Global app view.
   */
  app.views.CallView = Backbone.View.extend({

    events: {
      'click .btn-hangup': 'hangup'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.webrtc)
        throw new Error("missing parameter: webrtc");
      if (!options.el)
        throw new Error("missing parameter: el");

      this.webrtc = options.webrtc;
      this.webrtc.on('change:localStream', this._displayLocalVideo, this);
      this.webrtc.on('change:remoteStream', this._displayRemoteVideo, this);
    },

    hangup: function(event) {
      if (event)
        event.preventDefault();

      window.close();
    },

    _displayLocalVideo: function() {
      var localVideo = this.$('#local-video')[0];
      if (!localVideo)
        return this;
      var localStream = this.webrtc.get("localStream");
      localVideo.mozSrcObject = localStream;
      localVideo.play();
      return this;
    },

    _displayRemoteVideo: function() {
      var remoteVideo = this.$('#remote-video')[0];
      var remoteStream = this.webrtc.get("remoteStream");

      remoteVideo.mozSrcObject = remoteStream;
      remoteVideo.play();
      return this;
    }
  });

  /**
   * Text chat entry view.
   */
  app.views.TextChatEntryView = Backbone.View.extend({
    tagName: 'li',

    template: _.template('<strong><%= nick %>:</strong> <%= message %>'),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    }
  });

  /**
   * Text chat conversation view.
   */
  app.views.TextChatView = Backbone.View.extend({
    el: '#textchat', // XXX: uncouple the selector from this view

    me: undefined,

    events: {
      'submit form': 'send'
    },

    initialize: function(options) {
      this.collection = options.collection;
      this.webrtc = options.webrtc;

      app.port.on('talkilla.call-start', function(data) {
        this.me = data.caller; // If I'm receiving this, I'm the caller
      }, this);

      app.port.on('talkilla.call-incoming', function(data) {
        this.me = data.callee; // If I'm receiving this, I'm the callee
      }, this);

      this.collection.on('add', this.render, this);

      this.webrtc.on('dc.in.ready', function() {
        this.$('input').removeAttr('disabled');
      }, this);
    },

    send: function(event) {
      event.preventDefault();
      var $input = this.$('form input[name="message"]');
      var message = $input.val().trim();
      $input.val('');
      this.collection.newEntry({
        nick: this.me,
        message: message
      });
    },

    render: function() {
      var $ul = this.$('ul').empty();
      this.collection.each(function(entry) {
        var view = new app.views.TextChatEntryView({model: entry});
        $ul.append(view.render().$el);
      });
      return this;
    }
  });
})(app, Backbone, _, jQuery);
