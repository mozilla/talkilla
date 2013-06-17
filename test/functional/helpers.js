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
 * Signs out every user from the server.
 * @param  {Server} app
 */
function signOutEveryone(app) {
  app.set('users', {});
}
exports.signOutEveryone = signOutEveryone;

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

function after(nth, fn) {
  return function() {
    if (nth > 1) {
      nth -= 1;
      return;
    }

    fn.apply(this, arguments);
  }.bind(this);
}
exports.after = after;


function doneAfter(nth, done) {
  var doneHelper = after(nth, done);
  // done expects a potential error as a first argument, so we must
  // wrap it in a function that gets rid of any arguments.
  return function() { doneHelper() };
};
exports.doneAfter = doneAfter;

