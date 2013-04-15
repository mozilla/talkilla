/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

var app = require("../../presence").app;
var wdSync = require('wd-sync');
var expect = require("chai").expect;

var serverPort = 5000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

var client = wdSync.remote();
var browser = client.browser;
var sync = client.sync;

var browserConfig = {
  browserName: 'firefox'
};

/**
 * Patched in order to make chai tests failures being correctly processed in
 * a sync operation.
 *
 * @param  {String}   description
 * @param  {Function} cb
 */
function _it(description, cb) {
  return it(description, function(done) {
    var context = this;
    sync(function() {
      try {
        cb.call(context, done);
      } catch (err) {
        if (!done)
          throw err;
        done.call(context, err);
      }
    });
  });
}

describe("browser tests", function() {

  beforeEach(function(done) {
    this.timeout(10000); // firefox startup
    app.start(serverPort, function() {
      sync(function() {
        browser.init(browserConfig);
        done();
      });
    });
  });

  afterEach(function(done) {
    sync(function() {
      app.shutdown();
      browser.quit();
      done();
    });
  });

  _it("should opens the app in the browser", function(done) {
    browser.get(serverHttpBase);
    expect(browser.title()).to.equal("Talkilla");
    done();
  });

  _it("should signs a user in", function(done) {
    browser.get(serverHttpBase);
    browser.elementById('nick').type('bob');
    browser.elementById('submit').click();
    expect(browser.elementByCss('strong.nick').text()).to.equal('bob');
    done();
  });
});
