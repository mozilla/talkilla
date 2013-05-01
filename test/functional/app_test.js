/* global describe, it, before, after */
/* jshint expr:true */

var app = require("../../presence").app;
var expect = require("chai").expect;

var serverPort = 5000;
var serverHost = "localhost";
var serverHttpBase = 'http://' + serverHost + ':' + serverPort;

var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

var driver;

describe("browser tests", function() {
  this.timeout(60000);

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
    });
    driver.findElement(By.css("div.alert-info")).getText()
          .then(function(alert) {
      expect(alert).to.contain('only person');
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
    driver.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(false);
      done();
    });
  });
});
