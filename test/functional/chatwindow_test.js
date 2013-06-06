/* global describe, it, before, after */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;

var serverPort = 3000;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var helpers = require('./helpers');

var driver, driver2;

describe("Chat Window Tests", function() {
  this.timeout(600000);

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

  it("should open a chat window when clicking a nick", function(done) {
    helpers.signInUser(driver, "bob", {refresh: true});
    helpers.signInUser(driver2, "larry", {refresh: true});

    // Click a nick
    var firstUser = By.css("ul.nav-list>li>a");
    helpers.waitForSelector(driver2, firstUser);
    driver2.findElement(firstUser).click();

    // Check that we have a chat window
    driver2.switchTo().frame("//chatbox");

    // Check that a #call element exists
    helpers.waitForSelector(driver2, By.id("call")).then(function() {
      done();
    });
  });

});
