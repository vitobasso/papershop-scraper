var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build()

var mapping = loader.load('ebay')

var itemPathPattern = mapping.structure.container + mapping.structure.itemPattern
var itemPaths = xpath.expand(itemPathPattern)

Promise.all(mapping.actions.map(scheduleAction))
    .then(Promise.all(itemPaths.map(showFields))
        .then(driver.quit()))


function scheduleAction(action){
    console.log('action', action)
    if(action.type == 'go') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'type') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function showFields(itemPath) {
    console.log('showFields', itemPath)
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
        return driver.findElement(By.xpath(fieldPath))
    }
}
