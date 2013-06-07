var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

/**
 * Waits for a given selector to exist in the current page and returns a
 * promise.
 *
 * Options:
 * - timeout: time until an error is raised if no matching element is found
 *            (default: 10000)
 *
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {By|Object} expectedSelector
 * @param  {Object} options
 * @return {webdriver.promise.Promise}
 */
function waitForSelector(driver, expectedSelector, options) {
  "use strict";
  return driver.wait(function() {
    return driver.isElementPresent(expectedSelector);
  }, options && options.timeout || 10000);
}
exports.waitForSelector = waitForSelector;

/**
 * Waits for an element to become available and return a promise.
 * @param  {webdriver.webdriver.WebDriver} driver
 * @param  {By|Object} selector
 * @return {webdriver.promise.Promise}
 */
function waitForElement(driver, selector) {
  "use strict";
  waitForSelector(driver, selector);
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
