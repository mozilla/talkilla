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
               message: "empty message"}
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
    defaults: {username: undefined,
               fullName: undefined,
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
     * Overrides Backbone.Model#toJSON to include dynamically generated atribute
     * values.
     * @overrides Backbone.Model.prototype.toJSON
     * @return {Object}
     */
    toJSON: function() {
      return _.extend(Backbone.Model.prototype.toJSON.call(this), {
        fullName: this.get("fullName")
      });
    },

    /**
     * Overrides Backbone.Model#get to check if a method exists within the
     * current prototype to retrieve an attribute value, process it and returns
     * the resulting value.
     *
     * Fallbacks to standard Backbone.Model#get behavior when a string is passed
     * in.
     *
     * @param    {String|Function}  attribute  Attribute
     * @override {Backbone.Model.prototype.get}
     * @return   {any}
     */
    get: function(attribute) {
      if (typeof this[attribute] === "function")
        return this[attribute]();
      return Backbone.Model.prototype.get.call(this, attribute);
    },

    /**
     * Returns user full name when the attribute is available, or the username
     * by default.
     * @return {String}
     */
    fullName: function() {
      return this.attributes.fullName || this.get("username");
    },

    /**
     * Returns true if the user is logged in.
     */
    isLoggedIn: function() {
      return this.get('presence') !== "disconnected" &&
        this.get('username') !== undefined;
    },

    /**
     * Returns true if the user was logged in prior to the last change
     * on the model. Returns false if there have been no changes.
     */
    wasLoggedIn: function() {
      return this.previous('presence') !== "disconnected" &&
        this.previous('username') !== undefined;
    }
  });

})(app, Backbone);
