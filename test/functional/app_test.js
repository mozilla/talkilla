/* global describe, it, before, after */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;
var request = require("request");

var serverPort = 3000;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var helpers = require('./helpers');

var driver, driver2;

describe("Sidebar Tests", function() {
  this.timeout(600000);

  before(function(done) {
    app.start(serverPort, done);
  });

  after(function(done) {
    app.shutdown(done);
  });

  beforeEach(function(done) {
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

  afterEach(function(done) {
    helpers.signOutEveryone(app);

    driver2.quit();
    driver.quit();

    done();
  });

  it("should open the homepage", function(done) {
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.getTitle().then(function(title) {
      expect(title).to.equal("Talkilla Sidebar");
      done();
    });
  });

  describe("sign in", function () {

    beforeEach(function() {
      driver.switchTo().frame("//#social-sidebar-browser");
      driver2.switchTo().frame("//#social-sidebar-browser");
      helpers.signInUser(driver, "bob");
    });

    afterEach(function(done) {
      var doneHelper = helpers.doneAfter(2, done);

      driver.manage().deleteCookie('nick').then(doneHelper);
      driver2.manage().deleteCookie('nick').then(doneHelper);
    });

    it("should have the good nickname", function(done) {
      driver.findElement(By.css("strong.nick")).getText().then(function(nick) {
        expect(nick).to.equal('bob');
        done();
      });
    });

    it("should display the signout button", function(done) {
      driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
        expect(res).to.equal(true);
        done();
      });
    });

    it("should display an alert when the user is alone", function(done) {
      driver.findElements(By.css("div.alert-info")).then(function(res) {
        // XXX: Should we test the wording here?
        expect(res.length).to.equal(1);
        done();
      });
    });
  });

  describe("sign out", function() {

    beforeEach(function() {
      helpers.signInUser(driver, "bob");
    });

    it("should remove bob from the list of present users");

  });

  it("should handle an interuppted websocket connection", function(done) {
    helpers.signInUser(driver, "bob", {refresh: true});

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
