// TNetBin.js 0.2.1

// (c) 2012-2013 Romain Gauthier.
// TNetBin may be freely distributed under the MIT license.
// For all details and documentation:
// https://github.com/tOkeshu/tnetbin.js

(function(globalScope) {

  var tnetbin = {
    encode: function(obj) {
      switch (obj) {
      case null:
        return '0:~';
      case true:
        return '4:true!';
      case false:
        return '5:false!';
      }

      var type = typeof obj, s, tag;

      switch (type) {
      case 'string':
        s   = obj;
        tag = ',';
        break;
      case 'number':
        s = obj.toString();
        // Integer
        if (obj % 1 === 0)
          tag = '#';
        // Float
        else
          tag = '^';
        break;
      case 'object':
        if (obj instanceof ArrayBuffer) { // ArrayBuffer
          s = largeArrayToString(obj);
          tag = ',';
        } else if (obj instanceof Array) { // List
          s = obj.map(tnetbin.encode).join('');
          tag = ']';
        } else { // Object
          var attrs = [];
          for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) {
              attrs.push(tnetbin.encode(attr),
                         tnetbin.encode(obj[attr]));
            }
          }
          s = attrs.join('');
          tag = '}';
        }
      }

      return s.length + ':' + s + tag;
    },

    decode: function(data) {
      var result;
      data = this.toArrayBuffer(data);
      result = _decode(data, 0);

      return {value: result.value, remain: remain(data, result.cursor)};
    },

    toArrayBuffer: function(data) {
      if (data instanceof ArrayBuffer)
        return new Uint8Array(data);

      var len  = data.length;
      var view = new Uint8Array(len);
      // Transform the string to an array buffer
      for (var cursor = 0; cursor < len; cursor++)
        view[cursor] = data.charCodeAt(cursor);

      return view;
    }
  };

  var COLON   = 58;
  var ZERO    = 48;
  var NULL    = 126;
  var BOOLEAN = 33;
  var INTEGER = 35;
  var FLOAT   = 94;
  var STRING  = 44;
  var LIST    = 93;
  var DICT    = 125;

  function splitArrayBuffer(data) {
    var len = data.byteLength;
    var arrays = [];
    for (var i = 0; (i*2048) < len; i++)
      arrays.push(data.subarray((i * 2048), (i * 2048) + 2048));
    return arrays;
  }

  function largeArrayToString(data) {
    var s = '';
    splitArrayBuffer(new Uint8Array(data)).forEach(function (array) {
      s += String.fromCharCode.apply(null, array);
    });
    return s;
  }

  function _decode(data, cursor) {
    return _decodeSize(data, cursor, _decodePayload);
  }

  function _decodeSize(data, cursor, callback) {
    for (var size=0; data[cursor] !== COLON; cursor++) {
      size = size*10 + (data[cursor] - ZERO);
    }

    return callback(data, cursor + 1, size);
  }

  function _decodePayload(data, cursor, size) {
    var tag = data[cursor + size];
    switch (tag) {
    case NULL:
      return _decodeNull(data, cursor, size);
    case BOOLEAN:
      return _decodeBoolean(data, cursor, size);
    case INTEGER:
      return _decodeInteger(data, cursor, size);
    case FLOAT:
      return _decodeFloat(data, cursor, size);
    case STRING:
      return _decodeString(data, cursor, size);
    case LIST:
      return _decodeList(data, cursor, size);
    case DICT:
      return _decodeDict(data, cursor, size);
    default:
      return {value: undefined, cursor: cursor + size + 1};
    }
  }

  function remain(data, cursor) {
    var d = data.subarray(cursor);
    return largeArrayToString(d);
  }

  function _decodeNull(data, cursor) {
    return {value: null, cursor: cursor + 1};
  }

  function _decodeBoolean(data, cursor, size) {
    return {value: (size === 4) ? true : false, cursor: cursor + size + 1};
  }

  function _decodeInteger(data, cursor, size) {
    var end = cursor + size;
    for (var value = 0; cursor < end; cursor++)
      value = value*10 + (data[cursor] - ZERO);

    return {value: value, cursor: cursor + 1};
  }

  function _decodeFloat(data, cursor, size) {
    var value, exp, decimal;
    var end = cursor + size;

    for(value = 0; data[cursor] !== 46; cursor++)
      value = value*10 + (data[cursor] - ZERO);

    cursor++;
    for (decimal = 0, exp=1; cursor < end; cursor++, exp*=10) {
      decimal = decimal*10 + (data[cursor] - ZERO);
    }

    return {value: value + (decimal/exp), cursor: cursor + 1};
  }

  function _decodeString(data, cursor, size) {
    var d = data.subarray(cursor, cursor + size);
    var s = largeArrayToString(d);
    return {value: s, cursor: cursor + size + 1};
  }

  function _decodeList(data, cursor, size) {
    if (size === 0)
      return {value: [], cursor: cursor + 1};

    var list = [];
    var end  = cursor + size;
    var result;

    do {
      result = _decode(data, cursor);
      list.push(result.value);
      cursor = result.cursor;
    } while (cursor < end);

    return {value: list, cursor: result.cursor + 1};
  }

  function _decodeDict(data, cursor, size) {
    if (size === 0)
      return {value: {}, cursor: cursor + 1};

    var dict = {};

    var result = _decodeList(data, cursor, size);
    var items  = result.value;
    var len    = items.length;
    for (var i = 0; i < len; i+=2)
      dict[items[i]] = items[i + 1];

    return {value: dict, cursor: result.cursor};
  }

  globalScope.tnetbin = tnetbin;
}(window));

