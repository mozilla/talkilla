/*global IDBKeyRange */
/* jshint unused:false */

/**
 * Local contacts database powered by indexedDB.
 */
var ContactsDB = (function() {
  "use strict";

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
  function ContactsDB(options) {
    options = options || {};
    this.options = {
      dbname: options.dbname || "TalkillaContacts",
      storename: options.storename || "contacts",
      version: options.version || 2
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
  ContactsDB.prototype.load = function(cb) {
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
   * Adds a new contact to the database. Automatically opens the database
   * connection if needed.
   *
   * @param {String}   record Contact record
   * @param {Function} cb     Callback
   *
   * Callback parameters:
   * - {Error|null} err:    Encountered error, if any
   * - {String}     record: Inserted contact record
   */
  ContactsDB.prototype.add = function(record, cb) {
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
   * Replaces a set of contacts for a specific source.
   * Automatically opens the database connection if needed.
   *
   * XXX This is a poor man's sync, the idea is to delete all
   * contacts of the source, and then add the new ones in.
   *
   * XXX This might be cleaner if we can switch to the indexedDB sync
   * api for workers at some stage.
   *
   * @param {Array}   contacts Array of contact records. The records inside the
   *                           array are modified to include the source
   *                           parameter
   * @param {String}  source   The source of the contacts; may be null
   * @param {Function} cb     Callback
   *
   * Callback parameters:
   * - {Error|null} err:    Encountered error, if any
   * - {Array}     contacts: The array of contact records tagged with the source
   */
  ContactsDB.prototype.replaceSourceContacts = function(contacts, source, cb) {
    this.load(function(err) {
      if (err)
        return cb && cb.call(this, err);

      // This gets a transaction that we use throughout the function
      var store = this._getStore("readwrite");
      var index = store.index("source");
      var addIndex = 0;
      var cursor;

      // XXX Frameworkers don't have access to IDBKeyRange, so we
      // get the full range, and sort through them one-by-one.
      // When we are on a version that supports it, we can add this
      // as a parameter: (IDBKeyRange.only(source)
      var request = index.openCursor();

      request.onsuccess = function(event) {
        cursor = event.target.result;
        deleteNext.call(this);
      }.bind(this);

      request.onerror = function(err) {
        if (err)
          cb.call(this, err);
      }.bind(this);

      // This adds the new contacts, it is called when deleteNext
      // is finished.
      // It should always be called in the 'this' context of the object
      function addNext(err, record) {
        /*jshint validthis:true */
        if (err)
          return cb && cb.call(this, err);

        if (addIndex === contacts.length)
          return cb && cb.call(this, null, contacts);

        var contact = contacts[addIndex];
        addIndex++;
        contact.source = source;

        this.add(contact, addNext);
        return null;
      }

      // This handles the cursor for deleting the contacts
      // It should always be called in the 'this' context of the object
      function deleteNext(err) {
        /*jshint validthis:true */
        // If we've got to the end, start adding new items.
        if (!cursor)
          return addNext.call(this);

        // Delete existing contacts
        if (cursor.value.source !== source)
          cursor.continue();
        else {
          var deleteReq = store.delete(cursor.primaryKey);

          deleteReq.onsuccess = function() {
            cursor.continue();
          };

          deleteReq.onerror = function(event) {
            if (event.target.error)
              cb.call(this, event.target.error);
          };
        }
      }

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
  ContactsDB.prototype.all = function(cb) {
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
  ContactsDB.prototype.close = function() {
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
  ContactsDB.prototype.drop = function(cb) {
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
  ContactsDB.prototype._createStore = function(db) {
    // XXX: This isn't really very nice, but it isn't important
    // to persist contacts at the moment, so until we have good data
    // that we must do our best to save, we can get away with it.
    if (db.objectStoreNames.contains(this.options.storename))
      db.deleteObjectStore(this.options.storename);

    var store = db.createObjectStore(this.options.storename, {
      keyPath: "username"
    });
    store.createIndex("username", "username", {unique: true});
    store.createIndex("source", "source", {unique: false});
    return store;
  };

  /**
   * Retrieve current contact object store.
   *
   * @param  {String} mode Access mode - "readwrite" or "readonly")
   * @return {IDBObjectStore}
   */
  ContactsDB.prototype._getStore = function(mode) {
    return this.db.transaction(this.options.storename, mode)
                  .objectStore(this.options.storename);
  };

  return ContactsDB;
})();
