var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

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
  driver.findElement(By.name("nick")).sendKeys(user);
  return driver.findElement(By.id("submit")).click();
}
exports.signInUser = signInUser;

/**
 * Signs a user out.
 * @param  {WebDriver} driver
 * @return {WebDriver}
 */
function signOutUser(driver) {
  driver.switchTo().frame("//#social-sidebar-browser");
  return driver.findElement(By.css('#signout button')).click();
}
exports.signOutUser = signOutUser;

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

function isSignedIn(driver) {
  return driver.findElement(By.css("strong.nick")).getText()
    .then(function(nick) {
      return !!nick;
    });
}
exports.isSignedIn = isSignedIn;

