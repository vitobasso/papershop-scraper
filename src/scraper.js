var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
var driver = require('./driver/firefox').driver

var site = loader.load('ebay')

var itemPaths = xpath.expand(site.itemList.items)
var log = (s) => () => console.log(s)

Promise.all(site.steps.map(pageAction))
    .then( log("page: ready") )

function pageAction(action){
    console.log('action', action)
    if(action.type == 'go') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'type') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function scrapeItems(send){
    var t1 = Date.now()
    promiseAsync(itemPaths, scrapeFields)
        .then((items) => {
            var duration = Date.now() - t1 + "ms"
            console.log('scraped page: ', duration)
            nextPage()
            send(items)
        })
}

function nextPage(){
    pageAction(site.itemList['next-page'])
        .then( log("page: ready") )
}

function scrapeFields(itemPath) {
    var fieldKeys = Object.keys(site.itemList.fields)
    var t1 = Date.now()
    return promiseAsync(fieldKeys, extractField)
        .then( (values) => {
            item = gatherFields(values)
            var duration = Date.now() - t1 + "ms"
            console.log('extracted item: ', duration, item.title)
            return item
        })

    function extractField(key) {
        var field = site.itemList.fields[key]
        var extractor = text(field) || attr(field)
        var elmPath = itemPath + extractor.path
        var elm = find(elmPath)
        return extractor.getter(elm)
    }

    function gatherFields(values){
        return values.reduce(function(obj, value, i) {
            var key = fieldKeys[i]
            obj[key] = value;
            return obj;
        }, {});
    }

    function text(field){
        var match = /^(.*)\/text\(\)$/.exec(field)
        if(match) return {
            path: match[1],
            getter: (elm) => elm.getText()
        }
    }

    function attr(field){
        var match = /^(.*)\[@(.*)\]$/.exec(field)
        if(match) return {
            path: match[1],
            getter: (elm) => elm.getAttribute(match[2])
        }
    }
}

function find(path){
    var locator = By.xpath(path)
    return driver.findElement(By.xpath(path))
}

function promiseSync(arr, getPromise){
    if(arr.length == 0) return
    var head = arr[0]
    var tail = arr.slice(1)
    return getPromise(head)
        .then(() => promiseSync(tail, getPromise))
}

function promiseAsync(arr, f){
    return Promise.all(
        arr.map((x) => {
            var fx = () => f(x)
            return webdriver.promise.createFlow(fx)
        }))
}

// --------------------------------------------------------------------------------

var WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', function connection(ws) {
    console.log('ws: connected')

    ws.on('message', function incoming(message) {
        console.log('ws: received ', message);
        handle(message, ws)
    });
});

function handle(msg, ws){
    if(msg == 'more') {
        var send = (data) => {
            var msg = JSON.stringify(data)
            ws.send(msg)
        }
        scrapeItems(send)
    } else if(msg == 'quit') driver.quit()
}

