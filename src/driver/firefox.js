var webdriver = require('selenium-webdriver');
var firefox = require('selenium-webdriver/firefox');

var profile = new firefox.Profile();
//profile.setPreference('permissions.default.stylesheet', 2) //Disable CSS
profile.setPreference('permissions.default.image', 2) //Disable images
//profile.setPreference('javascript.enabled', false) //Disable JavaScript
profile.setPreference('dom.ipc.plugins.enabled.libflashplayer.so','false') //Disable Flash
var options = new firefox.Options().setProfile(profile);

exports.driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();