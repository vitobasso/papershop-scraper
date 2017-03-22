var webdriver = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder().forBrowser('chrome').build();


//driver.get('http://www.ebay.com');
//driver.findElement(By.xpath("//*[@id='gh-ac']")).sendKeys('Android');
//driver.findElement(By.xpath("//*[@id='gh-btn']")).click();
//driver.wait(until.elementLocated(By.xpath(container)), 5000);

var actions = [
    {type: "url", value: "http://www.ebay.com/"},
    {type: "click", target: "//*[@id='gh-ac']"},
    {type: "text", target: "//*[@id='gh-ac']", value: "Android"},
    {type: "click", target: "//*[@id='gh-btn']"}
]

var container = "/html/body/div[5]/div[2]/div[1]/div[1]/div/div[1]/div/div[3]/div/div[1]/div/w-root/div/div/ul"
var itemPattern = "/li[*4]" // expandable node
var title = "/h3/a"
var price = "/ul/li/span"
var from = "/ul[2]/li"
var type = "/ul/li[2]/span"
var photo = "/div/div/a/img"


var itemXPaths = expandPath(container+itemPattern)
itemXPaths.forEach(showFields)

function fireAction(action){
    if(action.type == 'url') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'text') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function showFields(itemXPath) {
//    var itemXPath = container + item(i)
    var textVal = driver.findElement(By.xpath(itemXPath + title)).getText()
    var priceVal = driver.findElement(By.xpath(itemXPath + price)).getText()
    var fromVal = driver.findElement(By.xpath(itemXPath + from)).getText()
    var typeVal = driver.findElement(By.xpath(itemXPath + type)).getText()
    var photoVal = driver.findElement(By.xpath(itemXPath + photo)).getAttribute("src")
    Promise.all([textVal, priceVal, fromVal, typeVal, photoVal]).then(
        (values) => console.log(values)
    )
}

//driver.quit();

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

// ------------------------------- expand xpath (previous impl) -----------------------------------------

// generates xpaths via index combinations for given original xpath
// e.g., given:     /div/div[]/ul/li[] (can have any indexes filled in)
//       returns:   /div/div[1]/ul/li[1]
//                  /div/div[1]/ul/li[2]
//                  /div/div[2]/ul/li[1]
//                  /div/div[2]/ul/li[2]
//                  ...
// "originalParts" is the given xpath split by "/"
//function expandXPath(prefix, suffixPattern){
//    var parts = suffixPattern.split('/')
//        .slice(1) //remove empty node before trailing "/"
//    return expandXPathSuffixes(prefix, parts).then(suffixesParts =>
//        suffixesParts
//            .map((parts) => parts.join('/'))
//            .map((s) => prefix + '/' + s)
//    )
//
//    function expandXPathSuffixes(prefix, originalParts, depth=0){
//        if(originalParts.length <= 0) return [] //TODO promise
//        if(prefix && !evaluateXPath(prefix)) return [] //TODO promise
//
//        var originalHead = originalParts[0]
//        var originalTail = originalParts.slice(1)
//
//        if(!originalHead.match(indexRegex)) {
//            return recursiveCall(prefix, originalHead, originalTail, depth) // recursion
//        }
//
//        var callForHead = (ithHead) =>
//            recursiveCall(prefix, ithHead, originalTail, depth) // recursion
//        return iterateXPathIndex(prefix, originalHead, callForHead)
//    }
//
//    function recursiveCall(prefix, head, tail, depth) {
//        if(tail.length <= 0) return [[head]] //TODO promise
//
//        var tailPrefix = prefix + '/' + head
//        expandXPathSuffixes(tailPrefix, tail, depth+1).then(newTails => { // recursion
//            var newParts = prependToAll(head, newTails)
//            return newParts
//        })
//    }
//}
//
//
//// generates indexes to "current"
//// e.g.: given "div[]", generates "div[1]", "div[2]", etc
//// counts prefix's children to tell when to stop
//function iterateXPathIndex(prefix, current, callback){
//    var tag = current.replace(indexRegex, '')
//    return countChildTags(prefix, tag).then(total => {
//        var results = []
//        for(var i=1; i<=total; i++){
//            var indexed = replaceFirstXPathIndex(current, i)
//            var ithResult = callback(indexed) //TODO callback returns promise
//            results = results.concat(ithResult)
//        }
//        return results;
//    })
//}
//
////replaces only the first occurrence
//function replaceFirstXPathIndex(xpath, i){
//    var replacement = '[' + i + ']'
//    return xpath.replace(indexRegex, replacement)
//}
//
//function countChildTags(xpath, tagName){
//    driver.findElement(By.xpath(xpath)).then(node => {
//        if(!node) return 0
//        var children = [...node.children]
//        var hasSameTag = (n) => n.tagName == tagName.toUpperCase()
//        return children.filter(hasSameTag).length
//    })
//}
