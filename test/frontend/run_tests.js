/* global describe, it, before, after */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;

var serverPort = 3000;
var serverHost = "localhost";
// XXX For now, the sidebar page isn't really in the social sidebar,
// so just add it.
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;
var testUrls = [
  '/test/frontend/index.html',
  '/test/frontend/chat/index.html',
  '/test/frontend/port/index.html',
  '/test/frontend/sidebar/index.html',
  '/test/frontend/webrtc/index.html',
  '/test/frontend/worker/index.html'
].map(function(path) {
  return serverHttpBase + path;
});

var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

var driver;

describe("frontend tests", function() {
  this.timeout(600000);

  before(function(done) {
    app.start(serverPort, function() {
      driver = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

      // This is the time we wait for all tests to complete.
      // We don't set this back to zero, as we don't need to, and
      // doing it after the tests may cause conflicts with the webdriver
      // trying to schedule something after quitting.
      driver.manage().timeouts().implicitlyWait(20000);

      done();
    });
  });

  after(function(done) {
    driver.quit();
    app.shutdown(done);
  });

  testUrls.forEach(function(testUrl) {
    it("should run " + testUrl + " tests without failures", function(done) {
      driver.get(testUrl).then(function() {
        driver.findElement(By.id('complete')).then(function () {
          driver.findElement(By.css('.failures > em')).getText()
            .then(function(text){
              expect(text).to.equal(String(0));
              done();
            });
        });
      });
    });
  });
});
