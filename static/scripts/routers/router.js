/*global Talkilla*/
define([
  'backbone',
  'collections/contacts',
  'views/index',
  'views/contacts'
], function(Backbone, ContactList, IndexView, ContactView) {
  return Backbone.Router.extend({
    nick: undefined,

    routes: {
        'contacts': 'contacts',
        '':         'index'
    },

    initialize: function() {
    },

    contacts: function() {
      if (!Talkilla.nick) {
        return Talkilla.navigate('', {trigger: true, replace: true});
      }
      var contacts = new ContactList();
      contacts.fetch({
        error: function() {
            alert('Could not load contacts');
        },
        success: function(contacts) {
          this.contactsView = new ContactView({collection: contacts});
          this.contactsView.render();
        }.bind(this)
      });
    },

    index: function() {
      this.indexView = new IndexView();
      this.indexView.render();
    }
  });
});
