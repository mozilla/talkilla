/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

process.env.NO_LOCAL_CONFIG = true;

var expect = require("chai").expect;
var request = require("request");
var app = require("../../server/server").app;
var path = require("path");
var merge = require("../../server/server").merge;
var getConfigFromFile = require("../../server/server").getConfigFromFile;
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

    it("getConfigFromFile should parse a JSON configuration file and return " +
       "an object", function() {
      // Use the test configurations
      var testConfigRoot = path.join('..', 'test', 'data');
      var config = getConfigFromFile(path.join(testConfigRoot, 'test1.json'));
      expect(config).to.have.property('DEBUG');
      expect(config.DEBUG).to.be.ok;
      expect(config).to.have.property('WSURL');
      expect(config.WSURL).to.be.equal('ws://127.0.0.1:5000/');

      config = getConfigFromFile(path.join(testConfigRoot, 'test2.json'));
      expect(config).to.have.property('DEBUG');
      expect(config.DEBUG).to.be.not.ok;
      expect(config).to.have.property('WSURL');
      expect(config.WSURL).to.be.equal('wss://talkilla.invalid/');
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
      app = require("../../server/server").app;
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
