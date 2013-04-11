/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

var expect = require("chai").expect;
var request = require("request");
var app = require("../presence").app;
var path = require("path");
var merge = require("../presence").merge;
var getConfigFromFile = require("../presence").getConfigFromFile;

describe("Server", function() {

  describe("configuration", function() {

    it("should merge two configuration objects", function() {
      expect(merge({}, {})).to.deep.equal({});
      expect(merge({}, {b: 2})).to.deep.equal({b: 2});
      expect(merge({a: 1}, {})).to.deep.equal({a: 1});
      expect(merge({a: 1}, {b: 2})).to.deep.equal({a: 1, b: 2});
      expect(merge({a: 1}, {a: 2})).to.deep.equal({a: 2});
    });

    it("should parse a JSON configuration file", function() {
      var configRoot = path.join('..', 'config');
      var devConfig = getConfigFromFile(path.join(configRoot, 'dev.json'));
      expect(devConfig).to.have.property('DEBUG');
      expect(devConfig.DEBUG).to.be.ok;
      var prodConfig = getConfigFromFile(path.join(configRoot, 'prod.json'));
      expect(prodConfig).to.have.property('DEBUG');
      expect(prodConfig.DEBUG).to.be.not.ok;
    });
  });
});
