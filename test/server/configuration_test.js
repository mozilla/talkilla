/* jshint expr:true */

process.env.NO_LOCAL_CONFIG = true;

var expect = require("chai").expect;
var path = require("path");
var sinon = require("sinon");

var app = require("../../server/server").app;
var api = require("../../server/server").api;
var merge = require("../../server/config").merge;
var getConfigFromFile = require("../../server/config").getConfigFromFile;

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

  describe("api", function() {

    var sandbox;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
    });

    afterEach(function() {
      sandbox.restore();
    });

    describe("#config", function() {

      it("should return the config as a JSON", function() {
        var req = {};
        var res = {header: sinon.spy(), send: sinon.spy()};
        var config = {fake: "configuration"};
        sandbox.stub(app, "get").returns(config);
        api.config(req, res);

        sinon.assert.calledOnce(res.header);
        sinon.assert.calledWithExactly(
          res.header, "Content-Type", "application/json");
        sinon.assert.calledOnce(res.send);
        sinon.assert.calledWithExactly(res.send, 200, JSON.stringify(config));
      });

    });

  });
});
