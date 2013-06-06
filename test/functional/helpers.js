var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

/**
 * Waits for a given selector to exist in the current page.
 *
 * Options:
 * - timeout: time until an error is raised if no matching element is found
 *
 * @param  {WebDriver} driver
 * @param  {By|Object} expectedSelector
 * @param  {Object} options
 * @return {WebDriver}
 */
function waitForSelector(driver, expectedSelector, options) {
  return driver.wait(function() {
    return driver.isElementPresent(expectedSelector);
  }, options && options.timeout || 10000);
}
exports.waitForSelector = waitForSelector;

/**
 * Waits for an element to become available and return its promise object.
 * @param  {WebDriver} driver
 * @param  {By|Object} selector
 * @return {WebDriver}
 */
function waitForElement(driver, selector) {
  waitForSelector(driver, selector);
  return driver.findElement(selector);
}
exports.waitForElement = waitForElement;

/**
 * Signs a user in.
 *
 * Options:
 * - refresh: will refresh the sidebar before signing in if true
 *
 * @param  {WebDriver} driver
 * @param  {String} user
 * @param  {Object} options
 * @return {WebDriver}
 */
function signInUser(driver, user, options) {
  driver.switchTo().frame("//#social-sidebar-browser");
  if (options && options.refresh === true)
    driver.navigate().refresh();
  var inputSelector = By.name("nick");
  waitForSelector(driver, inputSelector);
  driver.findElement(inputSelector).sendKeys(user);
  driver.findElement(By.id("submit")).click();
  return driver;
}
exports.signInUser = signInUser;

/**
 * Signs a user out.
 * @param  {WebDriver} driver
 * @return {WebDriver}
 */
function signOutUser(driver) {
  driver.switchTo().frame("//#social-sidebar-browser");
  driver.findElement(By.css('#signout button')).click();
  return driver;
}
exports.signOutUser = signOutUser;
