/* jshint unused:false */

/**
 * A general wrapper around XMLHttpRequest. Uses async requests.
 * When request callbacks are involked the parameters are:
 *
 * @param {Number} statusCode The status code of the request.
 *                            If this parameter is null, then the request
 *                            has succeeded.
 *                            Note: in some cases XMLHttpRequest can return 0 in
 *                            an error case (e.g. offline or CORS issue), so
 *                            that needs to be explicitly handled.
 * @param {String} statusText The response text if the request has succeed,
 *                            or the error text if a request has failed.
 */
var HTTP = (function() {
  "use strict";

  function HTTP() {}

  /**
   * Performs an HTTP request using XHR.
   * @param  {String}   method   HTTP method
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   *
   * @return {XMLHttpRequest}
   */
  HTTP.prototype.request = function(method, url, data, callback) {
    var xhr = new XMLHttpRequest();
    callback = callback || function() {};

    xhr.onload = function(event) {
      // sinon.js can call us with a null event a second time, so just
      // ignore it.
      if (!event)
        return;
      if (xhr.readyState === 4 &&
          (xhr.status === 200 || xhr.status === 204))
        return callback(null, xhr.responseText);
      callback(xhr.status, xhr.responseText);
    };

    xhr.onerror = function(event) {
      var text = (event.target && event.target.statusText) || "We are offline";
      callback(xhr.status, text);
    };

    xhr.open(method || 'GET', url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    if (data.timeout) {
      xhr.timeout = data.timeout;
      xhr.ontimeout = xhr.onerror;
    }

    xhr.send(JSON.stringify(data));
    return xhr;
  };

  /**
   * Performs a GET HTTP request.
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   *
   * @return {XMLHttpRequest}
   */
  HTTP.prototype.get = function(url, data, callback) {
    return this.request("GET", url, data, callback);
  };

  /**
   * Performs a POST HTTP request.
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   *
   * @return {XMLHttpRequest}
   */
  HTTP.prototype.post = function(url, data, callback) {
    return this.request("POST", url, data, callback);
  };

  return HTTP;
})();
