/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

process.env.NO_LOCAL_CONFIG = true;

var expect = require("chai").expect;
var request = require("request");
var app = require("../presence").app;
var path = require("path");
var merge = require("../presence").merge;
var getConfigFromFile = require("../presence").getConfigFromFile;
// This is the developer/production environment we are running in. For tests,
// this is controlled via the main Makefile.
var nodeEnv = process.env.NODE_ENV;

var serverPort = 3000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

describe("Server", function() {

  describe("general configuration functions", function() {

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

  describe("Specific Configuration", function() {

    beforeEach(function(done) {
      app.start(serverPort, done);
    });

    afterEach(function(done) {
      app.shutdown(done);
    });

    it("should render a configuration as JSON", function(done) {
      app = require("../presence").app;
      expect(app.get('env')).to.equal(nodeEnv);
      request.get(serverHttpBase + '/config.json', function(err, res, body) {
        expect(err).to.be.a('null');
        expect(body).to.be.ok;
        expect(JSON.parse(body)).to.be.an('object');
        expect(JSON.parse(body).DEBUG).to.equal(nodeEnv === 'development');
        done();
      });
    });
  });
});
