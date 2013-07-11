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

  it("should open a conversation window when clicking a nick",
    function(done) {
      // Click a nick
      var firstUser = By.css("ul.nav-list>li>a");
      helpers.waitForSelector(driver2, firstUser);
      driver2.findElement(firstUser).click();

      // Check that we have a chat window
      driver2.switchTo().frame("//chatbox");

      // Check that an #establish element exists and is visible
      driver2.getTitle().then(function(title) {
        expect(title).to.equal("bob");
        done();
      });
    });
});
