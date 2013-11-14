/* global gapi */
/* jshint unused:false, camelcase:false */
/**
 * Google Contacts API helper.
 */
var GoogleContacts = (function() {
  var AUTH_COOKIE_NAME = "google.auth.token";
  var AUTH_COOKIE_TTL = 365 * 10; // in days
  var MAX_RESULTS = 9999; // max number of contacts to fetch
  var config = {
    // This is a Talkilla specific client id.
    "client_id": "122170353410.apps.googleusercontent.com",
    "scope":     "https://www.google.com/m8/feeds"
  };
  var baseUrl = config.scope + "/contacts/default/full?v=3.0&alt=json";

  function buildUrl(params) {
    return [baseUrl, Object.keys(params || {}).map(function(name) {
      var value = params[name];
      return name + (value !== undefined ? "=" + value : "");
    }).join("&")].join("&");
  }

  /**
   * Constructor.
   *
   * @param {Object} options Options:
   * - {Port}   port           Social API port
   * - {String} authCookieName Authentication token cookie name
   * - {String} token          Authentication token
   */
  function GoogleContacts(options) {
    options = options || {};
    this.port = options.port;
    this.authCookieName = options.authCookieName || AUTH_COOKIE_NAME;
    this.authCookieTTL = options.authCookieTTL || AUTH_COOKIE_TTL;
    this.maxResults = options.maxResults || MAX_RESULTS;
    this.token = options.token || this._getToken();
  }

  /**
   * Contacts data importer.
   * @param {Object} feedData Google Contacts Data Feed
   */
  GoogleContacts.Importer = function(dataFeed) {
    this.dataFeed = dataFeed;
  };

  GoogleContacts.Importer.prototype = {
    /**
     * Extracts contact email addresses from current data feed.
     * @return {Array}
     */
    normalize: function() {
      return this.dataFeed.feed.entry.reduce(function(emails, entry) {
        if (!entry.gd$email)
          return emails;
        return emails.concat(entry.gd$email.map(function(email) {
          return {username: email.address};
        }));
      }, []);
    }
  };

  GoogleContacts.prototype = {
    /**
     * Initialises oauth for the popup window avoidance
     */
    initialize: function(cb) {
      if (typeof gapi !== "object")
        return cb && cb(new Error("gapi is missing"));

      // Init the google auth api now, because this needs to be done
      // before any button click for authorization.
      try {
        gapi.auth.init(cb);
      } catch (x) {
        console.log("Google Contacts API failed to initialize correctly");
      }
    },

    /**
     * OAuth autorization for accessing user's contacts through the Google
     * Contacts API. Will open an OAuth popup window requiring the user to allow
     * the application to access his contacts data.
     *
     * *Warning:* requires `gapi` Google Javascript Client API. This depends on
     * the DOM therefore can't be used within a WebWorker.
     *
     * @param  {Function} cb Callback
     */
    authorize: function(cb) {
      if (typeof gapi !== "object")
        return cb.call(this, new Error("gapi is missing"));

      gapi.auth.authorize(config, function(auth) {
        try {
          this._storeToken(auth.access_token);
          cb.call(this, null);
        } catch (err) {
          cb.call(this, err);
        }
      }.bind(this));
    },

    /**
     * Retrieves all Google Contacts from currently authenticated user.
     *
     * @param  {Function} cb Callback
     */
    all: function(cb) {
      if (!this.token)
        return cb.call(this, new Error("Missing token, please authorize."));
      // XXX: we should reuse worker http.js here - need to adapt it though
      var request = new XMLHttpRequest();
      request.onload = function(event) {
        var request = event && event.target, contacts;
        // sinon might pass us an empty event here
        if (!request || request.readyState !== 4)
          return;
        if (request.status !== 200)
          return cb.call(this, new Error(request.statusText));
        try {
          var feed = JSON.parse(request.responseText);
          cb.call(this, null, new GoogleContacts.Importer(feed).normalize());
        } catch (err) {
          cb.call(this, err);
        }
      }.bind(this);
      request.onerror = function(event) {
        cb.call(this, new Error("HTTP " + event.target.status + " error"));
      }.bind(this);
      request.open("GET", buildUrl({
        "max-results": this.maxResults,
        "access_token": encodeURIComponent(this.token)
      }), true);
      request.send();
    },

    /**
     * Loads contacts from the Google Contacts API and notify current opened
     * port through the `talkilla.contacts` event.
     *
     * Emits `talkilla.contacts-error` on any encountered error.
     */
    loadContacts: function() {
      this.authorize(function(err) {
        if (err)
          return this.port.postEvent("talkilla.contacts-error", err);
        this.all(function(err, contacts) {
          if (err)
            return this.port.postEvent("talkilla.contacts-error", err);
          this.port.postEvent("talkilla.contacts", {
            contacts: contacts,
            source: "google"
          });
        }.bind(this));
      }.bind(this));
    },

    /**
     * Retrieves stored Google API authentication token if it exists.
     *
     * @return {String|undefined}
     */
    _getToken: function() {
      return $.cookie(this.authCookieName);
    },

    /**
     * Stores a Google Authentication token in a cookie.
     *
     * @param  {String} token Authentication token
     */
    _storeToken: function(token) {
      if (!token)
        throw new Error("Can't store a missing auth token.");
      this.token = token;
      $.cookie(this.authCookieName, token, {expires: this.authCookieTTL});
    }
  };

  return GoogleContacts;
})();
