var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
var driver = require('./driver/phantomjs').driver


var site = loader.load('ebay')

var itemPathPattern = site.structure.container + site.structure.itemPattern
var itemPaths = xpath.expand(itemPathPattern)

Promise.all(site.steps.map(scheduleAction))
    .then(Promise.all(itemPaths.map(extractFields))
        .then(scheduleAction(site['next-page'])
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
    var textVal = find('title').getText()
    var priceVal = find('price').getText()
    var fromVal = find('from').getText()
    var typeVal = find('type').getText()
    var photoVal = find('photo').getAttribute("src")
    Promise.all([textVal, priceVal, fromVal, typeVal, photoVal]).then(
        (values) => console.log(values)
    )

    function find(field){
        var fieldPath = itemPath + site.structure.fields[field]
        var locator = By.xpath(fieldPath)
        driver.wait(until.elementLocated(locator), 5 * 1000)
        return driver.findElement(By.xpath(fieldPath))
    }
}
