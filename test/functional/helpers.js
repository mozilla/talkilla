var webdriver = require('selenium-webdriver'),
    By = webdriver.By;

function signInUser(driver, user, options) {
  driver.switchTo().frame("//#social-sidebar-browser");
  if (options && options.refresh === true)
    driver.navigate().refresh();
  driver.findElement(By.name("nick")).sendKeys(user);
  driver.findElement(By.id("submit")).click();
}
exports.signInUser = signInUser;
