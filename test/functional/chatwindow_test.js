/* global describe, it, before, after */
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

  it("should open a chat window when clicking a nick", function(done) {
    var bob = helpers.signInUser(driver, "bob", {refresh: true});
    var larry = helpers.signInUser(driver2, "larry", {refresh: true});

    // Click a nick
    helpers.waitForElement(larry, By.css("ul.nav-list>li>a")).click();

    // Check that we have a chat window
    larry.switchTo().frame("//chatbox");

    // Check that a #call element exists
    helpers.waitForSelector(larry, By.id("call")).then(function() {
      done();
    });
  });

  it("should allow text chat over data channel bewteen two signed in users",
    function(done) {
      var bob = helpers.signInUser(driver, "bob", {refresh: true});
      var larry = helpers.signInUser(driver2, "larry", {refresh: true});

      // Larry calls Bob
      helpers.waitForElement(larry, By.css("ul.nav-list>li>a")).click();

      // Larry sends "hi" to Bob
      larry.switchTo().frame("//chatbox");
      helpers.waitForElement(larry, By.css("form input:not([disabled])"))
             .sendKeys("hi");
      larry.findElement(By.css("form")).submit();
      helpers.waitForElement(larry, By.css("#textchat ul li"))
        .getText().then(function(text) {
          expect(text).to.contain("hi");
        });

      // Check if Bob has received Larry's message
      bob.switchTo().frame("//chatbox");
      helpers
        .waitForElement(bob, By.css("#textchat ul li"))
        .getText().then(function(text) {
          expect(text).to.contain("hi");
        });

      // Bob replies
      helpers.waitForElement(bob, By.css("form input:not([disabled])"))
             .sendKeys("how are you");
      bob.findElement(By.css("form")).submit();
      helpers.waitForElement(bob, By.css("#textchat ul li:nth-child(2)"))
        .getText().then(function(text) {
          expect(text).to.contain("how are you");
        });

      // Check if Larry has received Bob's message
      helpers
        .waitForElement(larry, By.css("#textchat ul li:nth-child(2)"))
        .getText().then(function(text) {
          expect(text).to.contain("how are you");
          done();
        });
    });

});
