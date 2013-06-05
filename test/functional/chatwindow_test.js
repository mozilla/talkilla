/* global describe, it, before, after */
/* jshint expr:true */

var presence = require("../../presence"),
    app = presence.app;
var expect = require("chai").expect;

var serverPort = 3000;
var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

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
    // Sign in user 1
    driver.switchTo().frame("//#social-sidebar-browser");
    driver.navigate().refresh();
    driver.findElement(By.name("nick")).sendKeys("bob");
    driver.findElement(By.id("submit")).click();

    // Sign in user 2
    driver2.switchTo().frame("//#social-sidebar-browser");
    driver2.navigate().refresh();
    driver2.findElement(By.name("nick")).sendKeys("larry");
    driver2.findElement(By.id("submit")).click();

    // Click a nick
    driver2.manage().timeouts().implicitlyWait(2000);
    driver2.findElement(By.css("ul.nav-list>li>a")).click();
    driver2.manage().timeouts().implicitlyWait(0);

    // Check that we have a chat window
    driver2.switchTo().frame("//chatbox");

    // Check that a #call element exists
    driver2.findElement(By.id("call")).then(function() {
      done();
    });
  });
});
