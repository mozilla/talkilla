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
  '/test/frontend/chatWindow.html'
].map(function(path) {
  return serverHttpBase + path;
});

var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

var driver;

describe("frontend tests", function() {
  this.timeout(120000);

  before(function(done) {
    app.start(serverPort, function() {
      driver = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

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
        driver.findElement(By.css('.failures > em')).getText()
          .then(function(text){
            expect(text).to.equal(String(0));
            done();
          });
      });
    });
  });
});
