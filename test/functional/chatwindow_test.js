/* global describe, it, before, after, beforeEach, afterEach */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;

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

  beforeEach(function() {
    helpers.signInUser(driver, "bob", {refresh: true});
    helpers.signInUser(driver2, "larry", {refresh: true});
  });

  afterEach(function() {
    helpers.signOutUser(driver2);
    helpers.signOutUser(driver);
  });

  it("should open a chat window with status info when clicking a nick",
    function(done) {
      // Click a nick
      var firstUser = By.css("ul.nav-list>li>a");
      helpers.waitForSelector(driver2, firstUser);
      driver2.findElement(firstUser).click();
driver2.sleep(1000);
      // Check that we have a chat window
      driver2.switchTo().frame("//chatbox");

      // Check that an #establish element exists and is visible
      helpers.waitForSelector(driver2, By.id("establish"));
      driver2.findElement(By.id("establish")).isDisplayed().then(
        function(displayed){
          expect(displayed).to.equal(true);
        });

      // Check for the expected status information
      var outgoingTextSelector =
        By.css("#establish>.outgoing-info>.outgoing-text");

      helpers.waitForSelector(driver2, outgoingTextSelector);
      driver2.findElement(outgoingTextSelector).
        getText().then(function (text) {
          expect(text).to.equal("Calling bob…");
          done();
        });
    });

});
