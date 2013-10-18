/* jshint unused:false */

var HTTP = (function() {
  function HTTP() {}

  /**
   * Performs an HTTP request using XHR.
   * @param  {String}   method   HTTP method
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   */
  HTTP.prototype.request = function(method, url, data, callback) {
    var xhr = new XMLHttpRequest();
    callback = callback || function() {};

    xhr.onload = function(event) {
      // sinon.js can call us with a null event a second time, so just
      // ignore it.
      if (!event)
        return;
      if (xhr.readyState === 4 && xhr.status === 200)
        return callback(null, xhr.responseText);
      callback(xhr.status, xhr.responseText);
    };

    xhr.onerror = function(event) {
      var text = (event.target && event.target.statusText) || "We are offline";
      callback(xhr.status, text);
    };

    xhr.open(method || 'GET', url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(data));
  };

  /**
   * Performs a GET HTTP request.
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   */
  HTTP.prototype.get = function(url, data, callback) {
    this.request("GET", url, data, callback);
  };

  /**
   * Performs a POST HTTP request.
   * @param  {String}   url      Endpoint URL
   * @param  {Object}   data     Request data
   * @param  {Function} callback Callback
   */
  HTTP.prototype.post = function(url, data, callback) {
    this.request("POST", url, data, callback);
  };

  return HTTP;
})();
