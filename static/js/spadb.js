/* jshint unused:false */

var SPADB = (function() {
  "use strict";

  var ON_BLOCKED_MAX_RETRIES = 10;

  function SPADB(options) {
    options = options || {};
    this.options = {
      dbname: options.dbname       || "EnabledSPA",
      storename: options.storename || "specs",
      version: options.version     || 2
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
  SPADB.prototype.load = function(cb) {
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
      this.db = event.target.result;
      this._createStore(this.db);
    }.bind(this);

    request.onsuccess = function(event) {
      this.db = event.target.result;
      cb.call(this, null, this.db);
    }.bind(this);
  };

  /**
   * Closes the indexedDB database.
   */
  SPADB.prototype.close = function() {
    if (!this.db)
      return;
    this.db.close();
    delete this.db;
  };

  /**
   * Adds a new SPA to the database. Automatically opens the
   * database connection if needed.
   *
   * @param {payloads.SPASpec} record: SPASpec record
   * @param {Function}             cb: Callback
   *
   * Callback parameters:
   * - {Error|null}          err: Encountered error, if any
   * - {payloads.SPASpec} record: Inserted SPASpec record
   */
  SPADB.prototype.add = function(record, cb) {
    this.load(function(err) {
      if (err)
        return cb.call(this, err);
      var request;
      try {
        request = this._getStore("readwrite").add(record);
      } catch (err) {
        return cb.call(this, err && err.message || "Unable to collect SPA");
      }
      request.onsuccess = function() {
        cb.call(this, null, record);
      }.bind(this);
      request.onerror = function(event) {
        var err = event.target.error;
        // ignore constraint error when a SPA already exists in the db
        if (err.name !== "ConstraintError")
          return cb.call(this, err);
        event.preventDefault();
        cb.call(this, null, record);
      }.bind(this);
    });
  };

  /**
   * Drops the indexedDB database.
   *
   * @param  {Function} cb Callback
   *
   * Callback parameters:
   * - {Error|null} err: Encountered error, if any
   */
  SPADB.prototype.drop = function(cb) {
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
   * Retrieves all SPASpec from the database. Automatically opens the
   * database connexion if needed.
   *
   * @param  {Function} cb Callback
   *
   * Callback parameters:
   * - {Error|null}   err: Encountered error, if any
   * - {Array}      specs: payloads.SPASpec Array
   */
  SPADB.prototype.all = function(cb) {
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
   * Creates the object store for SPA.
   *
   * @param  {IDBDatabase} db indexedDB database
   * @return {IDBObjectStore}
   */
  SPADB.prototype._createStore = function(db) {
    // XXX: This isn't really very nice, but it isn't important
    // to persist SPA at the moment, so until we have good data
    // that we must do our best to save, we can get away with it.
    if (db.objectStoreNames.contains(this.options.storename))
      db.deleteObjectStore(this.options.storename);

    var store = db.createObjectStore(this.options.storename, {
      keyPath: "name"
    });
    store.createIndex("name", "name", {unique: true});
    store.createIndex("src", "src", {unique: false});
    store.createIndex("credentials", "credentials", {unique: false});
    return store;
  };

  /**
   * Retrieve current SPA object store.
   *
   * @param  {String} mode Access mode - "readwrite" or "readonly")
   * @return {IDBObjectStore}
   */
  SPADB.prototype._getStore = function(mode) {
    return this.db.transaction(this.options.storename, mode)
                  .objectStore(this.options.storename);
  };

  return SPADB;
}());

