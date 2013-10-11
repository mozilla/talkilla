/* jshint unused:false */

/**
 * Local contacts database powered by indexedDB.
 */
var CollectedContacts = (function() {
  var ON_BLOCKED_MAX_RETRIES = 10;

  /**
   * Constructor.
   *
   * @param {Object} options Options
   *
   * Available options:
   * - {String} dbname: indexedDB database name (default: "TalkillaContacts")
   * - {String} storename: indexedDB database store name (default: "contacts")
   * - {Number} version: indexedDB database version number (default: 1)
   */
  function CollectedContacts(options) {
    options = options || {};
    this.options = {
      dbname: options.dbname || "TalkillaContacts",
      storename: options.storename || "contacts",
      version: options.version || 1
    };
    this.db = undefined;
  }

  /**
   * Loads the database.
   *
   * @param  {Function} cb Callback
   *
   * Callback parameters:
   * - {Error|null} err: Encountered error, if any
   * - {IDBDatabase} db: indexedDB database object
   */
  CollectedContacts.prototype.load = function(cb) {
    if (this.db)
      return cb.call(this, null, this.db);
    var request = indexedDB.open(this.options.dbname, this.options.version);
    request.onblocked = function(event) {
      cb.call(this, event.target.error);
    }.bind(this);
    request.onerror = function(event) {
      cb.call(this, event.target.errorCode);
    }.bind(this);
    request.onupgradeneeded = function(event) {
      // the callback will be called by the onsuccess event handler when the
      // whole operation is performed
      this._createStore(event.target.result);
    }.bind(this);
    request.onsuccess = function(event) {
      this.db = event.target.result;
      cb.call(this, null, this.db);
    }.bind(this);
  };

  /**
   * Adds a new contact to the database. Automatically opens the database
   * connexion if needed.
   *
   * @param {String}   record Contact record
   * @param {Function} cb     Callback
   *
   * Callback parameters:
   * - {Error|null} err:    Encountered error, if any
   * - {String}     record: Inserted contact record
   */
  CollectedContacts.prototype.add = function(record, cb) {
    this.load(function(err) {
      if (err)
        return cb.call(this, err);
      var request;
      try {
        request = this._getStore("readwrite").add(record);
      } catch (err) {
        return cb.call(this, err && err.message || "Unable to collect contact");
      }
      request.onsuccess = function() {
        cb.call(this, null, record);
      }.bind(this);
      request.onerror = function(event) {
        var err = event.target.error;
        // ignore constraint error when a contact already exists in the db
        if (err.name !== "ConstraintError")
          return cb.call(this, err);
        event.preventDefault();
        cb.call(this, null, record);
      }.bind(this);
    });
  };

  /**
   * Retrieves all contacts from the database. Automatically opens the database
   * connexion if needed.
   *
   * @param  {Function} cb Callback
   *
   * Callback parameters:
   * - {Error|null} err:      Encountered error, if any
   * - {Array}      contacts: Contacts list
   */
  CollectedContacts.prototype.all = function(cb) {
    this.load(function(err) {
      if (err)
        return cb.call(this, err);
      var cursor = this._getStore("readonly").openCursor(),
          records = [];
      cursor.onerror = function(event) {
        cb.call(this, event.target.errorCode);
      }.bind(this);
      cursor.onsuccess = function(event) {
        var cursor = event.target.result;
        if (!cursor)
          return cb.call(this, null, records);
        records.unshift(cursor.value);
        /* jshint -W024 */
        return cursor.continue();
      }.bind(this);
    });
  };

  /**
   * Closes the indexedDB database.
   */
  CollectedContacts.prototype.close = function() {
    if (!this.db)
      return;
    this.db.close();
    delete this.db;
  };

  /**
   * Drops the indexedDB database.
   *
   * @param  {Function} cb Callback
   *
   * Callback parameters:
   * - {Error|null} err:  Encountered error, if any
   */
  CollectedContacts.prototype.drop = function(cb) {
    var attempt = 0;
    this.close();
    var request = indexedDB.deleteDatabase(this.options.dbname);
    request.onsuccess = function() {
      if (cb)
        cb.call(this, null);
    }.bind(this);
    request.onerror = function(event) {
      if (cb)
        cb.call(this, event.target.errorCode);
    }.bind(this);
    request.onblocked = function(event) {
      // trigger an error if max number of attempts has been reached
      if (attempt >= ON_BLOCKED_MAX_RETRIES)
        return cb.call(this, new Error("Unable to drop a blocked database " +
                                       "after " + attempt + "attempts"));
      // reschedule another attempt for next tick
      setTimeout(this.drop.bind(this, cb), 0);
      attempt++;
    }.bind(this);
  };

  /**
   * Creates the object store for contacts.
   *
   * @param  {IDBDatabase}    db indexedDB database
   * @return {IDBObjectStore}
   */
  CollectedContacts.prototype._createStore = function(db) {
    var store = db.createObjectStore(this.options.storename, {
      keyPath: "username"
    });
    store.createIndex("username", "username", {unique: true});
    return store;
  };

  /**
   * Retrieve current contact object store.
   *
   * @param  {String} mode Access mode - "readwrite" or "readonly")
   * @return {IDBObjectStore}
   */
  CollectedContacts.prototype._getStore = function(mode) {
    return this.db.transaction(this.options.storename, mode)
                  .objectStore(this.options.storename);
  };

  return CollectedContacts;
})();
