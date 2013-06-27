var webdriver = require('selenium-webdriver'),
    By = webdriver.By;
var expect = require("chai").expect;

/**
 * Waits for a frame to become available in the browser environment and returns
 * a promise.
 *
 * Options:
 * - timeout: time until an error is raised if no matching frame is found
 *            (default: 10000)
 *
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {By|Object} expectedSelector
 * @param  {Object} options
 * @return {webdriver.promise.Promise}
 */
function waitForFrame(driver, name, options) {
  return driver.wait(
    function() {
      return driver.switchTo().frame(name).then(function() {
        return true;
      }, function() {
        return false;
      });
    },
    options && options.timeout || 10000,
    "frame " + name + " was never found"
  );
}
exports.waitForFrame = waitForFrame;

/**
 * Waits for a given selector to exist in the current page and returns a
 * promise.
 *
 * Options:
 * - timeout: time until an error is raised if no matching selector is found
 *            (default: 10000)
 *
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {By|Object} expectedSelector
 * @param  {Object} options
 * @return {webdriver.promise.Promise}
 */
function waitForSelector(driver, expectedSelector, options) {
  "use strict";
  return driver.wait(
    function() {
      return driver.isElementPresent(expectedSelector).then(function(present) {
        return present === true;
      });
    },
    options && options.timeout || 10000,
    "expected selector " + expectedSelector + " was never found"
  );
}
exports.waitForSelector = waitForSelector;

/**
 * Waits for an element to become available and returns a promise.
 *
 * Options:
 * - timeout: time until an error is raised if no matching element is found
 *            (default: 10000)
 *
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {By|Object} selector
 * @param  {Object} options
 * @return {webdriver.promise.Promise}
 */
function waitForElement(driver, selector, options) {
  "use strict";
  waitForSelector(driver, selector, options);
  return driver.findElement(selector);
}
exports.waitForElement = waitForElement;

/**
 * Signs a user in.
 *
 * Options:
 * - refresh: will refresh the sidebar before signing in if true
 *            (default: false)
 *
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {String} user
 * @param  {Object} options
 * @return {webdriver.webdriver.WebDriver}
 */
function signInUser(driver, user, options) {
  "use strict";
  driver.switchTo().frame("//#social-sidebar-browser");
  if (options && options.refresh === true)
    driver.navigate().refresh();
  waitForElement(driver, By.name("nick")).sendKeys(user);
  driver.findElement(By.id("submit")).click();
  return driver;
}
exports.signInUser = signInUser;

/**
 * Signs a user out.
 * @param  {webdriver.webdriver.WebDriver} driver
 * @return {webdriver.webdriver.WebDriver}
 */
function signOutUser(driver) {
  "use strict";
  driver.switchTo().frame("//#social-sidebar-browser");
  driver.findElement(By.css('#signout button')).click();
  return driver;
}
exports.signOutUser = signOutUser;

/**
 * Check if the given driver is signed in.
 * @param  {WebDriver} driver
 * @return {Promise} A promise that will be resolved to boolean
 */
function isSignedIn(driver) {
  var nick = By.css("strong.nick");
  waitForSelector(driver, nick, {timeout: 600000});
  return driver.findElement(nick).getText()
    .then(function(nick) {
      return !!nick;
    });
}
exports.isSignedIn = isSignedIn;

/**
 * Retrieves element text and trigger the provided callback.
 * @param  {WebDriver} driver
 * @param  {By|Object} selector
 * @param  {Function} cb(text)
 * @param  {Object} options
 * @return {webdriver.promise.Promise}
 */
function waitForText(driver, selector, cb, options) {
  return waitForElement(driver, selector, options).getText().then(cb);
}
exports.waitForText = waitForText;

function expectTextEquals(driver, selector, expectedText, options) {
  return waitForText(driver, selector, function(text) {
    expect(text).to.equal(expectedText);
  }, options);
}
exports.expectTextEquals = expectTextEquals;

function expectTextContains(driver, selector, extract, options) {
  return waitForText(driver, selector, function(text) {
    expect(text).to.contain(extract);
  }, options);
}
exports.expectTextContains = expectTextContains;

function expectDisplayed(driver, selector, options) {
  return waitForElement(driver, selector, options)
    .isDisplayed()
    .then(function(displayed){
      expect(displayed).to.equal(true);
    });
}
exports.expectDisplayed = expectDisplayed;
