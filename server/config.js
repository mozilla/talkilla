"use strict";

var fs = require('fs');
var path = require('path');

/**
 * Merges two objects.
 *
 * When conflicting, erases the values in the first object with the values
 * from the second one.
 *
 * Returns the first object (`obj`).
 *
 * @param  {Object} obj
 * @param  {Object} other
 * @return {Object}
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
 * Sets up root urls on a configuration object.
 *
 * The general rules for ROOTURL are:
 * - Use the ROOTURL from the config, or
 * - Use the PUBLIC_URL specified in the environment, or
 * - Use localhost with the serverPort.
 *
 * @param  {Object} config The configuration object to modify
 * @return {Object}
 */
function setupUrls(config) {
  var port = process.env.PORT || 5000;

  config.ROOTURL = config.ROOTURL ||
                   process.env.PUBLIC_URL ||
                   "http://localhost:" + port;

  return config;
}

/**
 * Retrieves a configuration object from a JSON file.
 *
 * If a "local.json" file exists, merge its content with the given file.
 * You can bypass this "local.json" file by setting up the NO_LOCAL_CONFIG
 * environment variable.
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

if (!process.env.SESSION_SECRET)
  throw new Error("Cannot set up sessions without a secret.\n\n" +
                  "Did you forget to setup the SESSION_SECRET variable?\n" +
                  "Try to run `make runserver` to solve the problem.\n");

module.exports.merge = merge;
module.exports.getConfigFromFile = getConfigFromFile;
module.exports.config =
  getConfigFromFile('./' + process.env.NODE_ENV + '.json');

