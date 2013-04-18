/* global describe, it, before, after */
/* jshint expr:true */

var util = require('util');
var app = require("../../presence").app;
var getConfigFromFile = require("../../presence").getConfigFromFile;
var expect = require("chai").expect;

var serverPort = 5000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var driver;

var config = getConfigFromFile('test.json');
var seleniumConfig = config && config.selenium;
var testServerUrl = util.format('http://%s:%d/wd/hub',
  process.env.SAUCE_HOST || seleniumConfig.host || 'localhost',
  process.env.SAUCE_PORT || seleniumConfig.port || 4444);

describe("browser tests", function() {
  this.timeout(60000);

  before(function(done) {
    app.start(serverPort, function() {
      driver = new webdriver.Builder().
        usingServer(testServerUrl).
        withCapabilities({
          name: "Talkilla browser tests",
          browserName: 'firefox',
          build: process.env.TRAVIS_BUILD_NUMBER,
          javascriptEnabled: true,
          platform: 'ANY',
          username: process.env.SAUCE_USERNAME || seleniumConfig.username,
          accessKey: process.env.SAUCE_ACCESS_KEY || seleniumConfig.accessKey
        }).
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
