/* global describe, it, before, after */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;

var serverPort = 3000;
var serverHost = "localhost";
// XXX For now, the sidebar page isn't really in the social sidebar,
// so just add it.
var serverHttpBase = 'http://' + serverHost + ':' + serverPort +
                     '/sidebar.html';

var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

var driver, driver2;

describe("browser tests", function() {
  this.timeout(60000);

  before(function(done) {
    app.start(serverPort, function() {
      driver = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

      driver2 = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

      done();
    });
  });

  after(function(done) {
    driver2.quit();
    driver.quit();
    app.shutdown(done);
  });

  it("should open the homepage", function(done) {
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.getTitle().then(function(title) {
      expect(title).to.equal("Talkilla Sidebar");
      done();
    });
  });

  it("should sign users in", function(done) {
    // Sign in user 1
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();
    driver.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('bob');
    });

    // Check there is a message that this is the only person logged in
    driver.findElement(By.css("div.alert-info")).getText()
          .then(function(alert) {
      expect(alert).to.contain('only person');
    });

    // Sign in user 2
    driver2.switchTo().frame("//#social-sidebar-browser");
    driver2.findElement(By.name("nick")).sendKeys("larry");
    driver2.findElement(By.id("submit")).click();
    driver2.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('larry');
    });

    // Check that both pages no longer have the alert on them
    driver.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver2.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
      done();
    });
  });

  it("should sign users out", function(done) {
    // Sign in user 1
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(true);
    });

    // Sign in user 2
    driver2.switchTo().frame("//#social-sidebar-browser");
    driver2.findElement(By.name("nick")).sendKeys("larry");
    driver2.findElement(By.id("submit")).click();
    driver2.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('larry');
    });

    // Sign out user 1
    driver.findElement(By.css('#signout button')).click();
    driver.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(false);
    });

    // Check there's an alert on user 2's screen
    driver2.findElement(By.css("div.alert-info")).getText()
          .then(function(alert) {
      expect(alert).to.contain('only person');
    });

    // Now sign out user 2
    driver2.findElement(By.css('#signout button')).click();
    driver2.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver2.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(false);
      done();
    });
  });

  it("should handle an interuppted websocket connection", function(done) {
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();
    driver.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('bob');
    }).then(function() {
      presence._destroyWebSocketServer();
    }).then(function() {
      driver.findElement(By.css("div.alert-warning")).getText()
            .then(function(alert) {
        expect(alert).to.contain('lost communication');
        done();
      });
    });
  });
});
