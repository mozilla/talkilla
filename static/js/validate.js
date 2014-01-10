(function(exports) {
  "use strict";

  /**
   * Simple object validator.
   *
   * @constructor
   * @param  {Object} rules Rules object
   */
  function Validator(rules) {
    this.rules = rules || {};
  }

  Validator.prototype = {
    /**
     * Validates all passed values against declared dependencies.
     *
     * @param  {Object} values  The values object
     * @return {Object}         The validated values object
     * @throws {TypeError}      If validation fails
     */
    validate: function(values) {
      this._checkRequiredProperties(values);
      this._checkRequiredTypes(values);
      return values;
    },

    /**
     * Checks if any of Object values matches any of current dependency type
     * requirements.
     *
     * @param  {Object} values The values object
     * @throws {TypeError}
     */
    _checkRequiredTypes: function(values) {
      Object.keys(this.rules).forEach(function(name) {
        var types = this.rules[name];
        types = Array.isArray(types) ? types : [types];
        if (!this._dependencyMatchTypes(values[name], types)) {
          throw new TypeError(
            "invalid dependency: " + name + "; expected " +
            types.map(function(type) {
              if (type === null)
                return "null";
              return type && type.name;
            }).join(", "));
        }
      }, this);
    },

    /**
     * Checks if a values object owns the required keys defined in dependencies.
     * Values attached to these properties shouldn't be null nor undefined.
     *
     * @param  {Object} values The values object
     * @throws {TypeError} If any dependency is missing.
     */
    _checkRequiredProperties: function(values) {
      var settedValues = Object.keys(values).filter(function(name) {
        return typeof values[name] !== "undefined";
      });
      var diff = _.difference(Object.keys(this.rules), settedValues);
      if (diff.length > 0)
        throw new TypeError("missing required " + diff.join(", "));
    },

    /**
     * Checks if a given value matches any of the provided type requirements.
     *
     * @param  {Object} value  The value to check
     * @param  {Array}  types  The list of types to check the value against
     * @return {Boolean}
     * @throws {TypeError} If the value doesn't match any types.
     */
    _dependencyMatchTypes: function(value, types) {
      return types.some(function(Type) {
        /*jshint eqeqeq:false*/
        try {
          return typeof Type === "undefined"     ||   // skip checking
                 Type === null && value === null ||   // null type
                 value.constructor == Type       ||   // native type
                 Type.prototype.isPrototypeOf(value); // custom type
        } catch (e) {
          return false;
        }
      });
    }
  };

  exports.Validator = Validator;
})(this);
