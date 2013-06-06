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
    driver2.manage().timeouts().implicitlyWait(2000);
    driver2.findElement(By.css("ul.nav-list>li>a")).click();
    driver2.manage().timeouts().implicitlyWait(0);

    // Check that we have a chat window
    driver2.switchTo().frame("//chatbox");

    // Check that a #call element exists
    driver2.findElement(By.id("call"));

    // Close the chat window
    driver2.close().then(function() {
      done();
    });
  });
});
