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
 * Retrieves a configuration object from a JSON file.
 *
 * @param  {String} file Path to JSON configuration file
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
  return config;
}

module.exports.merge = merge;
module.exports.getConfigFromFile = getConfigFromFile;
module.exports.config =
  getConfigFromFile('./' + process.env.NODE_ENV + '.json');

