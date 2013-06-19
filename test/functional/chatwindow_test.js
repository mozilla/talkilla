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

  // it("should open a chat window with status info when clicking a nick",
  //   function(done) {
  //     // Click a nick
  //     var firstUser = By.css("ul.nav-list>li>a");
  //     helpers.waitForSelector(driver2, firstUser);
  //     driver2.findElement(firstUser).click();

  //     // Check that we have a chat window
  //     driver2.switchTo().frame("//chatbox");

  //     // Check that an #establish element exists and is visible
  //     helpers.waitForSelector(driver2, By.id("establish"));
  //     driver2.findElement(By.id("establish")).isDisplayed().then(
  //       function(displayed){
  //         expect(displayed).to.equal(true);
  //       });

  //     // Check for the expected status information
  //     var outgoingTextSelector =
  //       By.css("#establish>.outgoing-info>.outgoing-text");

  //     helpers.waitForSelector(driver2, outgoingTextSelector);
  //     driver2.findElement(outgoingTextSelector).
  //       getText().then(function (text) {
  //         expect(text).to.equal("Calling bob…");
  //         done();
  //       });
  //   });

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
      helpers.waitForElement(larry, By.css("#textchat ul li"))
        .getText().then(function(text) {
          expect(text).to.contain("hi");
        });

      // Check if Bob has received Larry's message
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
