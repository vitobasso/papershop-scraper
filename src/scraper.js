var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
    promise = webdriver.promise
var driver = require('./driver/firefox').driver

var site = loader.load('ebay')
var log = s => () => console.log(s)

prepare().then(() => console.log('page ready'))
function prepare(){
    if(site.preparation){
        console.log('prepare')
        var steps = site.preparation
        return promise.all(steps.map(pageAction))
    } else return promise.fulfilled()

    function pageAction(step){
        console.log('step', step)
        if(step.action == 'go') return driver.get(step.target)
        if(step.action == 'click') return find(step.target).click();
        console.error('unknown action', step)
    }

    function find(path){
        var locator = By.xpath(path)
        return driver.findElement(locator)
    }
}

function extractItems(params, respond){
    goToPage(params)
        .then(() => injectExtractor(site, 'items'))
        .then(items => {
            var filtered = filter(items)
            respond('items', filtered)
            respond('features', getOccurringFeatures(filtered))
        })

    function filter(items) {
        var filtered = items.filter(i => i.title && i.price)
        var diff = items.length - filtered.length
        if(diff > 0) console.log("rejected items:", diff)
        return filtered
    }

    function getOccurringFeatures(items){
        var mapping = site.itemList.fields
        var featureKeys = Object.keys(mapping)
            .filter(k => mapping[k].feature)
        var result = items.reduce(includeItemFields, {})
        result = featureKeys.map(k => ({
            key: k,
            values: setToArray(result[k])
        }))
        return result

        function includeItemFields(acc, item){
            Object.keys(item)
                .filter(k => featureKeys.includes(k))
                .forEach(k => { //include value of feature 'k' found in current item
                    if(!acc[k]) acc[k] = new Set([])
                    if(item[k]) acc[k] = acc[k].add(item[k])
                })
            return acc
        }

        function setToArray(set){
            return set ? [...set] : []
        }
    }
}

function extractFeatures(params, respond){
    injectExtractor(site, 'features')
        .then(features => respond('features', features))
}

function goToPage(params){
    var template = site.url
    var urlParams = getUrlParams(params)
    var url = template.formatUnicorn(urlParams)
    console.log('goToPage', url)
    return driver.get(url)

    function getUrlParams(request){
        var keywords = request.keywords
        var page = request.page
        if(site.pagingMode == 'offset') {
            var itemsPerPage = request.itemsPerPage
            var offset = itemsPerPage * (page - 1)
            return {KEYWORDS: keywords, ITEMS_PER_PAGE: itemsPerPage, OFFSET: offset}
        } else {
            return {KEYWORDS: keywords, PAGE: page}
        }
    }
}

String.prototype.formatUnicorn = String.prototype.formatUnicorn ||
function () {
    "use strict";
    var str = this.toString();
    if (arguments.length) {
        var t = typeof arguments[0];
        var key;
        var args = ("string" === t || "number" === t) ? Array.prototype.slice.call(arguments) : arguments[0];
        for (key in args) {
            str = str.replace(new RegExp("\\$\\{" + key + "\\}", "gi"), args[key]);
        }
    }
    return str;
};

// ------------------------------- WebSocket -------------------------------

var WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', function connection(ws) {
    console.log('ws: connected')

    ws.on('message', strMsg => {
        console.log('ws: received:', strMsg);
        var jsonMsg = JSON.parse(strMsg)
        handle(jsonMsg, ws)
    });
});

function handle(msg, ws){
    if(msg.subject == 'items') extractItems(msg.params, respondFor(ws))
    else if(msg.subject == 'features') extractFeatures(msg.params, respondFor(ws))
    else if(msg.subject == 'quit') driver.quit()
}

function respondFor(ws){
    return (subject, data) => {
        var jsonMsg = {
            subject: subject,
            content: data
        }
        strMsg = JSON.stringify(jsonMsg)
        ws.send(strMsg)
    }
}

// ------------------------------- Inject code -------------------------------

var fs = require('fs');
var path = require('path');

function injectExtractor(mapping, mode){
    return inject('extractor', [mapping, mode])
}

function inject(fileName, args){
    //console.log('inject', fileName, args)
    var jsonPath = path.join(__dirname, 'injectable', fileName + '.js')
    var content = fs.readFileSync(jsonPath, 'utf8')
    return driver.executeScript(content, args)
}