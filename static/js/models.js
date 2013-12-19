/*global app */
/**
 * Talkilla models and collections.
 */
(function(app, Backbone) {
  "use strict";

  /**
   * Notification model.
   */
  app.models.Notification = Backbone.Model.extend({
    defaults: {type:    "default",
               message: "empty message",
               timeout: undefined}
  });

  /**
   * SPA model.
   */
  app.models.SPA = Backbone.Model.extend({
    defaults: {capabilities: []},

    /**
     * Triggers a `dial` event with user entered PSTN number.
     * @param  {String} number User entered PSTN number
     * @throws {Error}         If SPA doesn't support the `pstn-call` capability
     */
    dial: function(number) {
      if (!this.supports("pstn-call"))
        throw new Error("SPA doesn't support PSTN calls");

      this.trigger("dial", number);
    },

    /**
     * Checks if the SPA supports any of the capabilities passed as arguments.
     * @return {Boolean}
     */
    supports: function() {
      if (arguments.length === 0)
        throw new Error("At least one capability is expected");

      return _.intersection(arguments, this.get("capabilities")).length > 0;
    }
  });

  /**
   * User model.
   */
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

})(app, Backbone);
