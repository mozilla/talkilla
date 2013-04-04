/* global Talkilla, Backbone, _, jQuery*/
/**
 * Talkilla Backbone views.
 */
(function(app, Backbone, _, $) {
  "use strict";

  /**
   * User list entry view.
   */
  app.views.UserEntryView = Backbone.View.extend({
    tagName: 'li',

    render: function() {
      var nick = this.model.get('nick');
      this.$el.html(
        '<a href="#call/' + nick + '"><i class="icon-user"/>' + nick + '</a>');
      return this;
    }
  });

  /**
   * User list view.
   */
  app.views.UsersView = Backbone.View.extend({
    el: '#users',

    views: [],

    initViews: function() {
      this.views = [];
      this.collection.each(function(model) {
        this.views.push(new app.views.UserEntryView({model: model}));
      }.bind(this));
    },

    initialize: function(options) {
      this.collection = options && options.users;
      if (this.collection) {
        this.initViews();
        return this.render();
      }
      this.collection = new app.models.UserSet();
      this.collection.fetch({
        error: function() {
          app.utils.notifyUI('Could not load connected users list', 'error');
        },
        success: function() {
          this.initViews();
          this.render();
        }.bind(this)
      });
    },

    render: function() {
      var userList = _.chain(this.views).map(function(view) {
        return view.render();
      }).pluck('el').value();
      this.$('li:not(.nav-header)').remove();
      this.$('ul').append(userList);
      if (app.data.user && this.collection.length === 0)
        this.$('#invite').show();
      else
        this.$('#invite').hide();
      return this;
    }
  });

  /**
   * Login/logout forms view.
   */
  app.views.LoginView = Backbone.View.extend({
    el: '#login',

    events: {
      'submit form#signin': 'signin',
      'submit form#signout': 'signout'
    },

    initialize: function(options) {
      this.user = options && options.user;
    },

    render: function() {
      if (!this.user) {
        this.$('#signin').show();
        this.$('#signout').hide().find('.nick').text('');
      } else {
        this.$('#signin').hide();
        this.$('#signout').show().find('.nick').text(this.user.get('nick'));
      }
      return this;
    },

    signin: function(event) {
      event.preventDefault();
      var nick = $.trim($(event.currentTarget).find('[name="nick"]').val());
      if (!nick)
        return app.utils.notifyUI('please enter a nickname');
      app.services.login(nick, function(err, user, users) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        app.data.user = user;
        app.data.users = users;
        app.trigger('signin', user);
        app.router.navigate('', {trigger: true});
        app.router.index();
      });
    },

    signout: function(event) {
      event.preventDefault();
      app.services.logout(function(err) {
        if (err)
          return app.utils.notifyUI(err, 'error');
        delete app.data.callee;
        delete app.data.user;
        app.trigger('signout');
        app.router.navigate('', {trigger: true});
        app.router.index();
      });
    }
  });

  /**
   * Main video conversation view.
   */
  app.views.CallView = Backbone.View.extend({
    el: '#call',

    local: undefined,

    events: {
      'click .btn-initiate': 'initiate',
      'click .btn-hangup':   'hangup'
    },

    initialize: function(options) {
      this.hangup();
      this.user = options && options.user;
      this.callee = options && options.callee;
      this.local = $('#local-video').get(0);
    },

    initiate: function() {
      // TODO:
      // - extract the processus to some external lib?
      // - handle asynchronicity (events?)
      navigator.mozGetUserMedia(
        {video: true, audio: true},

        function onSuccess(stream) {
          app.utils.log('local video enabled');
          this.local.mozSrcObject = stream;
          this.local.play();
          this.$('.btn-initiate').addClass('disabled');
          this.$('.btn-hangup').removeClass('disabled');
        }.bind(this),

        function onError(err) {
          app.utils.log(err);
          app.utils.notifyUI('Impossible to access your webcam/microphone',
                             'error');
        });
    },

    hangup: function() {
      if (this.local && this.local.mozSrcObject) {
        this.local.mozSrcObject.stop();
        this.local.mozSrcObject = null;
      }
      this.$('.btn-initiate').removeClass('disabled');
      this.$('.btn-hangup').addClass('disabled');
    },

    render: function() {
      if (!this.callee) {
        this.$el.hide();
        return this;
      }
      this.$('h2').text('Calling ' + this.callee.get('nick'));
      this.initiate();
      this.$el.show();
      return this;
    }
  });
})(Talkilla, Backbone, _, jQuery);
