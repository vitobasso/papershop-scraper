var webdriver = require('selenium-webdriver');

var driver = new webdriver.Builder()
    .forBrowser('firefox')
//    .forBrowser('phantomjs')
    .build();
driver.get('http://www.google.com');
driver.executeScript(function(a) { a * 2, 4 }).then(function(result) {
    console.log('4 * 2 = ' + result);
});
driver.quit();

