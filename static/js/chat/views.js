/* global app, Backbone, _, jQuery */
/**
 * Talkilla Backbone views.
 */
/* jshint unused: vars */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * Conversation View (overall)
   */
  app.views.ConversationView = Backbone.View.extend({
    events: {
      'dragover': 'dragover',
      'drop': 'drop'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");
      if (!options.peer)
        throw new Error("missing parameter: peer");

      this.call = options.call;
      this.peer = options.peer;

      this.peer.on('change:nick', function(to) {
        document.title = to.get("nick");
      });

      this.call.on('offer-timeout', function() {
        // outgoing call didn't go through, close the window
        window.close();
      });
    },

    _checkDragTypes: function(types) {
      if (!types.contains("text/x-moz-url") &&
          !types.contains("text/x-moz-text-internal"))
        return false;
      return true;
    },

    dragover: function(event) {
      var dataTransfer = event.originalEvent.dataTransfer;

      if (!this._checkDragTypes(dataTransfer.types))
        return;

      // Need both of these to make the drag work
      event.stopPropagation();
      event.preventDefault();
      dataTransfer.dropEffect = "copy";
    },

    drop: function(event) {
      var dataTransfer = event.originalEvent.dataTransfer;

      if (!this._checkDragTypes(dataTransfer.types))
        return;

      event.preventDefault();

      var url;
      var tabData = dataTransfer.getData("text/x-moz-text-internal");
      var urlData = dataTransfer.getData("text/x-moz-url");

      if (urlData)
        url = urlData.split('\n')[0]; // get rid of the title
      else if (tabData)
        url = tabData;

      this.$('#textchat [name="message"]').val(url).focus();
    }
  });

  /**
   * Call offer view
   */
  app.views.CallOfferView = Backbone.View.extend({
    el: "#offer",

    events: {
      'click .btn-accept': 'accept',
      'click .btn-ignore': 'ignore'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");

      this.call = options.call;

      options.call.on('change:state', function(to, from) {
        if (to === "incoming")
          this.$el.show();
        else if (from === "incoming")
          this.$el.hide();

        this.render();
      }.bind(this));
    },

    accept: function(event) {
      if (event)
        event.preventDefault();

      this.call.accept();
    },

    ignore: function(event) {
      if (event)
        event.preventDefault();

      this.call.ignore();

      window.close();
    },

    render: function() {
      // XXX: update caller's avatar, though we'd need to access peer
      //      as a User model instance
      return this;
    }
  });

  /**
   * Call establish view
   */
  app.views.CallEstablishView = Backbone.View.extend({
    el: "#establish",

    events: {
      'click .btn-abort': '_abort'
    },

    outgoingTextTemplate: _.template('Calling <%= peer %>…'),

    initialize: function(options) {
      options = options || {};
      if (!options.peer)
        throw new Error("missing parameter: peer");

      this.peer = options.peer;

      this.model.on("change:state", this._handleStateChanges.bind(this));
    },

    _handleStateChanges: function(to, from) {
      if (to === "pending" && from === "ready") {
        this.$el.show();
      } else if (to !== "pending" && from === "pending") {
        this.$el.hide();
      }

      this.render();
    },

    _abort: function(event) {
      if (event)
        event.preventDefault();

      window.close();
    },

    render: function() {
      // XXX: update caller's avatar, though we'd need to access peer
      //      as a User model instance
      var peer = this.peer.get('nick');
      var formattedText = this.outgoingTextTemplate({peer: peer});
      this.$('.outgoing-text').text(formattedText);

      return this;
    }
  });

  /**
   * Video/Audio Call View
   */
  app.views.CallView = Backbone.View.extend({

    events: {
      'click .btn-hangup a': 'hangup'
    },

    initialize: function(options) {
      options = options || {};
      if (!options.call)
        throw new Error("missing parameter: call");
      if (!options.el)
        throw new Error("missing parameter: el");

      this.call = options.call;
      this.call.media.on('change:localStream', this._displayLocalVideo, this);
      this.call.media.on('change:remoteStream', this._displayRemoteVideo, this);

      options.call.on('change:state', function(to) {
        if (to === "ongoing")
          this.ongoing();
        else if (to === "terminated")
          this.terminated();
      }, this);
    },

    hangup: function(event) {
      if (event)
        event.preventDefault();

      window.close(); // XXX: actually terminate the call and leave the
                      // conversation window open (eg. for text chat)
    },

    ongoing: function() {
      this.$el.show();
      this.$('.btn-video').hide();
      this.$('.btn-audio').hide();
      this.$('.btn-hangup').show();
    },

    terminated: function() {
      this.$el.hide();
      this.$('.btn-video').show();
      this.$('.btn-audio').show();
      this.$('.btn-hangup').hide();
    },

    _displayLocalVideo: function() {
      var localVideo = this.$('#local-video')[0];
      if (!localVideo)
        return this;
      var localStream = this.call.media.get("localStream");
      localVideo.mozSrcObject = localStream;
      localVideo.play();
      return this;
    },

    _displayRemoteVideo: function() {
      var remoteVideo = this.$('#remote-video')[0];
      var remoteStream = this.call.media.get("remoteStream");

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

    template: _.template([
      '<strong><%= nick %>:</strong>',
      '<%= linkify(message, {attributes: {class: "chat-link"}}) %>'
    ].join(' ')),

    events: {
      'click .chat-link': 'click'
    },

    click: function(event) {
      event.preventDefault();

      window.open($(event.currentTarget).attr('href'));
    },

    render: function() {
      this.$el.html(this.template(_.extend(this.model.toJSON(), {
        linkify: app.utils.linkify
      })));
      return this;
    }
  });

  /**
   * Text chat conversation view.
   */
  app.views.TextChatView = Backbone.View.extend({
    el: '#textchat', // XXX: uncouple the selector from this view

    events: {
      'submit form': 'send'
    },

    initialize: function(options) {
      if (!options.call)
        throw new Error("missing parameter: call");
      if (!options.collection)
        throw new Error("missing parameter: collection");

      this.collection = options.collection;
      this.call = options.call;
      this.media = options.call.media;

      this.collection.on('add', this.render, this);

      this.media.on('dc.in.ready', function() {
        this.$('input').removeAttr('disabled');
      }, this);

      this.call.on('change:state', function(to) {
        if (to === "ongoing")
          this.$el.show();
        else if (to !== "ongoing")
          this.$el.hide();
      }.bind(this));
    },

    send: function(event) {
      event.preventDefault();
      var $input = this.$('form input[name="message"]');
      var message = $input.val().trim();

      $input.val('');

      this.collection.newEntry({
        nick: app.data.user.get("nick"),
        message: message
      });
    },

    render: function() {
      var $ul = this.$('ul').empty();
      this.collection.each(function(entry) {
        var view = new app.views.TextChatEntryView({model: entry});
        $ul.append(view.render().$el);
      });
      var ul = $ul.get(0);
      ul.scrollTop = ul.scrollTopMax;
      return this;
    }
  });
})(app, Backbone, _, jQuery);
