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
   * Stores an SPA to the database. If the SPA does not exist,
   * it will add it, otherwise it will update the existing record.
   *
   * @param {payloads.SPASpec} record: SPASpec record
   * @param {Function}             cb: Callback
   *
   * Callback parameters:
   * - {Error|null}          err: Encountered error, if any
   * - {payloads.SPASpec} record: Inserted SPASpec record
   */
  SPADB.prototype.store = function(record, cb) {
    this.load(function(err) {
      if (err)
        return cb.call(this, err);

      var store;
      try {
        store = this._getStore("readwrite");
      } catch (err) {
        return cb(err && err.message ? err :
          new Error("Unable to get the store"));
      }

      this._add(store, record, function (err) {
        if (err) {
          if (err.name !== "ConstraintError")
            return cb(err);

          // We might have an existing record already, so update it instead.
          return this._update(store, record, function(err) {
            if (err)
              return cb(err);

            return cb(null, record);
          });
        }

        return cb(null, record);
      });
    });
  };

  /**
   * Private function to adds a new SPA to the database.
   *
   * @param {IDBObjectStore}    store: The database store
   * @param {payloads.SPASpec} record: SPASpec record
   * @param {Function}             cb: Callback
   *
   * Callback parameters:
   * - {Error|null}          err: Encountered error, if any
   * - {payloads.SPASpec} record: Inserted SPASpec record
   */
  SPADB.prototype._add = function(store, record, cb) {
    var request;
    try {
      request = store.add(record);
    } catch (err) {
      return cb.call(this, err && err.message ? err :
        new Error("Unable to add SPA record"));
    }
    request.onsuccess = function() {
      cb.call(this, null, record);
    }.bind(this);
    request.onerror = function(event) {
      var err = event.target.error;
      event.preventDefault();
      cb.call(this, err);
    }.bind(this);
  };

  /**
   * Private function to update a SPA within the database. Automatically
   * opens the database connection if needed.
   *
   * @param {IDBObjectStore}    store: The database store
   * @param {payloads.SPASpec} record: SPASpec record
   * @param {Function}             cb: Callback
   *
   * Callback parameters:
   * - {Error|null}          err: Encountered error, if any
   * - {payloads.SPASpec} record: Inserted SPASpec record
   */
  SPADB.prototype._update = function(store, record, cb) {
    function handleerror(event) {
      // This function is bound to this where it is used below.
      /* jshint validthis:true */
      var err = event.target.error;
      event.preventDefault();
      cb.call(this, err);
    }

    var requestUpdate;
    try {
      requestUpdate = store.put(record);
    } catch (err) {
      return cb.call(this, err && err.message ? err :
        new Error("Unable to put new SPA"));
    }
    requestUpdate.onerror = handleerror.bind(this);
    requestUpdate.onsuccess = function(event) {
      cb.call(this, null, record);
    }.bind(this);
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

