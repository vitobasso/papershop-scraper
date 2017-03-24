var webdriver = require('selenium-webdriver');
var phantomjs = require('selenium-webdriver/phantomjs');

//"javascriptEnabled" false
//"loadImages" false
exports.driver = new webdriver.Builder()
    .forBrowser('phantomjs')
    .build()

