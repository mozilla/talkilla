/* jshint expr:true */

process.env.NO_LOCAL_CONFIG = true;
process.env.PORT = 3000;
var PORT = 3000;

var expect = require("chai").expect;
var path = require("path");
var sinon = require("sinon");

var api = require("../../server/server").api;
var merge = require("../../server/config").merge;
var config = require("../../server/config");

describe("Server", function() {

  describe("general configuration functions", function() {

    it("should merge two configuration objects", function() {
      expect(merge({}, {})).to.deep.equal({});
      expect(merge({}, {b: 2})).to.deep.equal({b: 2});
      expect(merge({a: 1}, {})).to.deep.equal({a: 1});
      expect(merge({a: 1}, {b: 2})).to.deep.equal({a: 1, b: 2});
      expect(merge({a: 1}, {a: 2})).to.deep.equal({a: 2});
    });

    describe("#getConfigFromFile", function() {
      var testConfigRoot = path.join('..', 'test', 'data');
      var publicUrl = 'https://example.com';
      // This should match public url, save for the scheme
      var wsUrl = 'wss://example.com';

      afterEach(function() {
        delete process.env.PUBLIC_URL;
      });

      it("getConfigFromFile should parse a JSON configuration file and " +
         "return an object", function() {
        // Use the test configurations
        var testConfig = config.getConfigFromFile(path.join(testConfigRoot,
                                                            'test1.json'));
        expect(testConfig).to.have.property('DEBUG');
        expect(testConfig.DEBUG).to.be.ok;
        expect(testConfig).to.have.property('WSURL');
        expect(testConfig.WSURL).to.be.equal('ws://127.0.0.1:5000/');

        testConfig = config.getConfigFromFile(path.join(testConfigRoot,
                                                        'test2.json'));
        expect(testConfig).to.have.property('DEBUG');
        expect(testConfig.DEBUG).to.be.not.ok;
        expect(testConfig).to.have.property('WSURL');
        expect(testConfig.WSURL).to.be.equal('wss://talkilla.invalid/');
      });

      it("should default to localhost", function() {
        var testConfig =
          config.getConfigFromFile(path.join(testConfigRoot,
                                             'test3.json'), PORT);

        expect(testConfig).to.have.property('ROOTURL');
        expect(testConfig.ROOTURL).to.be.equal('http://localhost:' + PORT);
        expect(testConfig).to.have.property('WSURL');
        expect(testConfig.WSURL).to.be.equal('ws://localhost:' + PORT);
      });

      it("should use the public url from the environment if defined",
        function() {
          process.env.PUBLIC_URL = publicUrl;

          var testConfig =
            config.getConfigFromFile(path.join(testConfigRoot,
                                               'test3.json'), PORT);

          expect(testConfig).to.have.property('ROOTURL');
          expect(testConfig.ROOTURL).to.be.equal(publicUrl);
          expect(testConfig).to.have.property('WSURL');
          expect(testConfig.WSURL).to.be.equal(wsUrl);
        });

      it("should use the root url from the configuration if defined",
        function() {
          var testConfig =
            config.getConfigFromFile(path.join(testConfigRoot,
                                               'test4.json'), PORT);

          expect(testConfig).to.have.property('ROOTURL');
          expect(testConfig.ROOTURL).to.be.equal('http://example2.com');
          expect(testConfig).to.have.property('WSURL');
          expect(testConfig.WSURL).to.be.equal('ws://example2.com');
        });
    });
  });

  describe("api", function() {

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("#config", function() {

      it("should return the config in a js file", function() {
        var req = {};
        var res = {header: sinon.spy(), send: sinon.spy()};
        api.config(req, res);

        sinon.assert.calledOnce(res.header);
        sinon.assert.calledWithExactly(
          res.header, "Content-Type", "application/javascript");
        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 200,
                                       'function loadConfig() { return ' +
                                       JSON.stringify(config.config) +
                                       '; }');
      });

    });

  });
});
