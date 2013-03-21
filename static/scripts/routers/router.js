define([
  'backbone',
  'common',
  'collections/contacts',
  'views/index'
], function(Backbone, Common, ContactList, IndexView) {
  return Backbone.Router.extend({
    routes: {
        '': 'root'
    },

    initialize: function() {
    },

    root: function() {
      var contacts = new ContactList();
      contacts.fetch({
        error: function() {
            alert('could not load contacts');
        },
        success: function(contacts) {
          this.IndexView = new IndexView({collection: contacts});
          this.IndexView.render();
        }.bind(this)
      });
    }
  });
});
