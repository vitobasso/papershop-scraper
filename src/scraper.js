var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
//    chrome = require('selenium-webdriver/chrome'),
    firefox = require('selenium-webdriver/firefox'),
    By = webdriver.By,
    until = webdriver.until;

//var driver = new webdriver.Builder()
//    .forBrowser('chrome')
//    .build()
var profile = new firefox.Profile();
//profile.setPreference('permissions.default.stylesheet', 2) //Disable CSS
profile.setPreference('permissions.default.image', 2) //Disable images
//profile.setPreference('javascript.enabled', false) //Disable JavaScript
profile.setPreference('dom.ipc.plugins.enabled.libflashplayer.so','false') //Disable Flash
var options = new firefox.Options().setProfile(profile);
var driver = new webdriver.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(options)
    .build();


var mapping = loader.load('ebay')

var itemPathPattern = mapping.structure.container + mapping.structure.itemPattern
var itemPaths = xpath.expand(itemPathPattern)

Promise.all(mapping.steps.map(scheduleAction))
    .then(Promise.all(itemPaths.map(extractFields))
        .then(scheduleAction(mapping['next-page'])
            .then(Promise.all(itemPaths.map(extractFields))
                .then(driver.quit())
            )
        )
    )

function scheduleAction(action){
    console.log('action', action)
    if(action.type == 'go') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'type') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function extractFields(itemPath) {
    console.log('extract', itemPath)
    var textVal = find('title').getText()
    var priceVal = find('price').getText()
    var fromVal = find('from').getText()
    var typeVal = find('type').getText()
    var photoVal = find('photo').getAttribute("src")
    Promise.all([textVal, priceVal, fromVal, typeVal, photoVal]).then(
        (values) => console.log(values)
    )

    function find(field){
        var fieldPath = itemPath + mapping.structure.fields[field]
        var locator = By.xpath(fieldPath)
        driver.wait(until.elementLocated(locator), 5 * 1000)
        return driver.findElement(By.xpath(fieldPath))
    }
}
