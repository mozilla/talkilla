/* global describe, it, beforeEach, afterEach */
/* jshint expr:true */

var app = require("../../presence").app;
var wd = require('wd');
var expect = require("chai").expect;

var serverPort = 5000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

var browser = wd.promiseRemote();
var browserConfig = {
  browserName: 'firefox'
};

// browser methods

describe("browser tests", function() {
  beforeEach(function(done) {
    this.timeout(10000); // firefox startup time
    app.start(serverPort, function() {
      browser.init(browserConfig).then(function() {
        done();
      });
    });
  });

  afterEach(function(done) {
    browser.quit(function() {
      app.shutdown(done);
    });
  });

  it("should opens the app in the browser", function(done) {
    browser.get(serverHttpBase).then(function() {
      return browser.title();
    }).then(function(title) {
      expect(title).to.equal("Talkilla");
    }).done(done);
  });

  it("should signs a user in", function(done) {
    browser.get(serverHttpBase).then(function() {
      return browser.elementById('nick');
    }).then(function(input) {
      return input.type('bob');
    }).then(function() {
      return browser.elementById('submit');
    }).then(function(button) {
      return button.click();
    }).then(function() {
      return browser.elementByCss('strong.nick');
    }).then(function(el) {
      return el.text();
    }).then(function(nick) {
      expect(nick).to.equal('bob');
    }).done(done);
  });
});
