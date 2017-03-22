var webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until;

var capabilities = {
    prefs: {
       profile: {
           managed_default_content_settings: {
               images: 2
           }
       }
    }
}

var driver = new webdriver.Builder()
    .withCapabilities(capabilities)
    .forBrowser('chrome')
    .build()

var mapping = {
    actions: [
        {type: "url", value: "http://www.ebay.com/"},
        {type: "click", target: "//*[@id='gh-ac']"},
        {type: "text", target: "//*[@id='gh-ac']", value: "Android"},
        {type: "click", target: "//*[@id='gh-btn']"}
    ],
    structure: {
        container: "/html/body/div[5]/div[2]/div[1]/div[1]/div/div[1]/div/div[3]/div/div[1]/div/w-root/div/div/ul",
        itemPattern: "/li[*4]", // expandable node
        fields: {
            title: "/h3/a",
            price: "/ul/li/span",
            from: "/ul[2]/li",
            type: "/ul/li[2]/span",
            photo: "/div/div/a/img"
        }
    }
}

var itemPathPattern = mapping.structure.container + mapping.structure.itemPattern
var itemPaths = expandPath(itemPathPattern)

var actionPromises = mapping.actions.map(scheduleAction)
Promise.all(actionPromises).then(() => {
    console.log('after action promises')
    itemPaths.forEach(showFields)
})

//driver.quit();

function scheduleAction(action){
    console.log('scheduleAction', action)
    if(action.type == 'url') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'text') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
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

// ------------------------------- expand xpath -----------------------------------------


function expandPath(path){
    var parts = path.split('/')
    return expandSuffix(parts)

    function expandSuffix(parts){
       if(parts.length == 0) return []
       var head = parts[0]
       var tail = parts.slice(1)
       var suffixes = expandSuffix(tail)
       var prependSuffixes = prefix => prependToAll(prefix + '/', suffixes)
       return flatten(expandNode(head).map(prependSuffixes))
    }
}

function expandNode(node){
    var regex = /\*(\d+)/
    if(!regex.test(node)) return [node]

    var num = getNum(node)
    var range = [...Array(num).keys()]
    return range.map(i => replace(node, i+1))

    function getNum(node){
        var match = regex.exec(node)
        return parseInt(match[1])
    }

    function replace(node, i){
        return node.replace(regex, i)
    }
}

function prependToAll(prefix, suffixes){
    if(suffixes.length == 0) return [prefix]
    return suffixes.map(s => prefix + s)
}

function flatten(xss) {
    return Array.prototype.concat.apply([], xss);
};
