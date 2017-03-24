var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');

exports.driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build()