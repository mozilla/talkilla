var fs = require('fs');
var path = require('path');

/**
 * Merges two objects
 *
 * @param  {String} obj
 * @param  {String} other
 * @return {String}
 */
function merge(obj, other) {
  var keys = Object.keys(other);
  for (var i = 0, len = keys.length; i < len; ++i) {
    var key = keys[i];
    obj[key] = other[key];
  }
  return obj;
}

/**
 * Sets up root and websocket urls on a configuration object.
 *
 * The general rules for ROOTURL are:
 * - Use the ROOTURL from the config, or
 * - Use the PUBLIC_URL specified in the environment, or
 * - Use localhost with the serverPort.
 *
 * For WSURL:
 * - Use the WSURL from the config, or
 * - Replace the "http" from ROOTURL with "ws" (this also handles https -> wss).
 *
 * @param  {Object} config     The configuration object to modify
 * @return {Object}
 */
function setupUrls(config) {
  var port = process.env.PORT || 5000;

  config.ROOTURL = config.ROOTURL ||
                   process.env.PUBLIC_URL ||
                   "http://localhost:" + port;

  // Now replace the scheme on the url with what we need for the websocket.
  // This assumes the url starts with http, if you want anything else, you're on
  // your own.
  config.WSURL = config.WSURL || "ws" + config.ROOTURL.substr(4);
  return config;
}

/**
 * Retrieves a configuration object from a JSON file.
 *
 * @param  {String}  file       Path to JSON configuration file
 * @return {Object}
 */
function getConfigFromFile(file) {
  var configRoot = path.join(__dirname, '..', 'config'),
      config = JSON.parse(fs.readFileSync(path.join(configRoot, file)));

  if (!process.env.NO_LOCAL_CONFIG) {
    var localConfigFile = path.join(configRoot, 'local.json');
    if (fs.existsSync(localConfigFile)) {
      config = merge(config, JSON.parse(fs.readFileSync(localConfigFile)));
    }
  }

  return setupUrls(config);
}

module.exports.merge = merge;
module.exports.getConfigFromFile = getConfigFromFile;
module.exports.config =
  getConfigFromFile('./' + process.env.NODE_ENV + '.json');

