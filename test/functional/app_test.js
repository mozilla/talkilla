/* global describe, it, before, after */
/* jshint expr:true */

var app = require("../../presence").app;
var expect = require("chai").expect;

var serverPort = 5000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var testServerUrl = 'http://localhost:4444/wd/hub';
var capabilities = {
  name: "Talkilla Browser Tests",
  browserName: 'firefox'
};
var driver;

if (process.env.SAUCE_ENABLED) {
  // use the Sauce Connect proxy server
  testServerUrl = 'http://localhost:4445/wd/hub';
  capabilities.name = "Travis build #" + process.env.TRAVIS_BUILD_NUMBER;
  capabilities.build = process.env.TRAVIS_BUILD_NUMBER;
  capabilities.username = process.env.SAUCE_USERNAME;
  capabilities.accessKey = process.env.SAUCE_ACCESS_KEY;
}

describe("browser tests", function() {
  this.timeout(60000);

  before(function(done) {
    app.start(serverPort, function() {
      driver = new webdriver.Builder().
        usingServer(testServerUrl).
        withCapabilities(capabilities).
        build();
      done();
    });
  });

  after(function(done) {
    driver.quit();
    app.shutdown(done);
  });

  it("should open the homepage", function(done) {
    driver.get(serverHttpBase);
    driver.getTitle().then(function(title) {
      expect(title).to.equal("Talkilla");
      done();
    });
  });

  it("should sign a user in", function(done) {
    driver.get(serverHttpBase);
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();
    driver.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('bob');
      done();
    });
  });

  it("should sign a user out", function(done) {
    driver.get(serverHttpBase);
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(true);
    });
    driver.findElement(By.css('#signout button')).click();
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(false);
      done();
    });
  });
});
