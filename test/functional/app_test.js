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

describe("Sidebar Tests", function() {
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

  it("should open the homepage", function(done) {
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.getTitle().then(function(title) {
      expect(title).to.equal("Talkilla Sidebar");
      done();
    });
  });

  it("should sign users in and out", function(done) {
    // Sign in user 1
    helpers.signInUser(driver, "bob");
    driver.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('bob');
    });
    driver.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(true);
    });

    // Check there is a message that this is the only person logged in
    driver.findElement(By.css("div.alert-info")).getText()
          .then(function(alert) {
      expect(alert).to.contain('only person');
    });

    // Sign in user 2
    helpers.signInUser(driver2, "larry");
    driver2.findElement(By.css("strong.nick")).getText().then(function(nick) {
      expect(nick).to.equal('larry');
    });

    // Check that both pages no longer have the alert on them
    driver.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver2.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });

    // Sign out user 1
    helpers.signOutUser(driver);
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
    helpers.signOutUser(driver2);
    driver2.findElements(By.css("div.alert-info")).then(function(res) {
      expect(res).to.deep.equal([]);
    });
    driver2.findElement(By.id("signout")).isDisplayed().then(function(res) {
      expect(res).to.equal(false);
      done();
    });
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

  describe("persistent login", function() {

    before(function(done) {
      helpers.signInUser(driver, "bob");
      done();
    });

    after(function(done) {
      helpers.signOutUser(driver);
      done();
    });

    it("should keep me signed in even if I reload the sidebar",
      function (done) {
        var isSignedIn = helpers.isSignedIn.bind(this, driver);

        driver.navigate().refresh()
          .then(isSignedIn)
          .then(function(signedIn) {
            expect(signedIn).to.be.True;
            done();
          });
      });

    it("should keep me signed in even if I close the browser", function (done) {
      var session;
      function saveSession() {
        return driver.manage().getCookies().then(function(cookies) {
          session = cookies;
        });
      }

      function restartBrowser() {
        return driver.quit().then(function() {
          driver = new webdriver.Builder().
            usingServer('http://localhost:4444/wd/hub').
            withCapabilities({'browserName': 'firefox'}).
            build();
        }).then(function() {
          driver.switchTo().frame("//#social-sidebar-browser");

          session.forEach(function(cookie) {
            driver.manage().addCookie(cookie.name, cookie.value);
          });

          return driver.navigate().refresh();
        });
      }

      function isSignedIn() {
        return helpers.isSignedIn(driver);
      }

      saveSession()
        .then(restartBrowser)
        .then(isSignedIn)
        .then(function(signedIn) {
          expect(signedIn).to.be.True;
          done();
        });
    });

  });

});
