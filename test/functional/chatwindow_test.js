/* global describe, it, before, after, beforeEach, afterEach */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;

var serverPort = 3000;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var helpers = require('./helpers');

var bob, larry;

describe("Chat Window Tests", function() {

  this.timeout(600000);

  before(function(done) {
    app.start(serverPort, function() {
      bob = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

      larry = new webdriver.Builder().
        usingServer('http://localhost:4444/wd/hub').
        withCapabilities({'browserName': 'firefox'}).
        build();

      done();
    });
  });

  after(function(done) {
    bob.quit();
    larry.quit();
    app.shutdown(done);
  });

  beforeEach(function() {
    helpers.signInUser(bob, "bob", {refresh: true});
    helpers.signInUser(larry, "larry", {refresh: true});
  });

  afterEach(function() {
    helpers.signOutUser(bob);
    helpers.signOutUser(larry);
  });

  it("should open a chat window with status info when clicking a nick",
    function(done) {
      // Click a nick
      helpers.waitForElement(larry, By.css("ul.nav-list>li>a")).click();

      // Check that we have a chat window
      larry.switchTo().frame("//chatbox");

      // Check that an #establish element exists and is visible
      helpers.expectDisplayed(larry, By.id("establish"));

      // Check for the expected status information
      helpers.expectTextEquals(larry,
        By.css("#establish>.outgoing-info>.outgoing-text"), "Calling bob…")
        .then(function() {
          done();
        });
    });

  it("should allow text chat over data channel bewteen two signed in users",
    function(done) {
      // Larry calls Bob
      helpers.waitForElement(larry, By.css("ul.nav-list>li>a")).click();

      // Bob accepts the incoming call
      helpers.waitForFrame(bob, "//chatbox");
      helpers.waitForElement(bob, By.css("#offer .btn-accept")).click();

      // Larry sends "hi" to Bob
      larry.switchTo().frame("//chatbox");
      helpers.waitForElement(larry, By.css("form input:not([disabled])"))
             .sendKeys("hi");
      larry.findElement(By.css("form")).submit();
      helpers.expectTextContains(larry, By.css("#textchat ul li"), "hi");

      // Check if Bob has received Larry's message
      helpers.expectTextContains(bob, By.css("#textchat ul li"), "hi");

      // Bob replies
      helpers.waitForElement(bob, By.css("form input:not([disabled])"))
             .sendKeys("how are you");
      bob.findElement(By.css("form")).submit();
      helpers.expectTextContains(bob, By.css("#textchat ul li:nth-child(2)"),
        "how are you");

      // Check if Larry has received Bob's message
      helpers.expectTextContains(larry, By.css("#textchat ul li:nth-child(2)"),
        "how are you").then(function() {
          done();
        });
    });

});
