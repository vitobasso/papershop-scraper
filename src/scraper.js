var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
    promise = webdriver.promise
var driver = require('./driver/firefox').driver

var site = loader.load('ebay')

var itemPaths = xpath.expand(site.itemList.items)
var log = s => () => console.log(s)

promise.all(site.steps.map(pageAction))
    .then( log("page: ready") )

function pageAction(action){
    console.log('action', action)
    if(action.type == 'go') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'type') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function extractItems(send){
    var t1 = Date.now()
    promiseAsync(itemPaths, extractItem)
        .then(items => {
            var duration = Date.now() - t1 + "ms"
            console.log('extracted items:', duration)
            nextPage()
            send(items)
        })

    function extractItem(itemPath) {
        var fieldKeys = Object.keys(site.itemList.fields)
        var t1 = Date.now()
        return promiseAsync(fieldKeys, extractField)
            .then(values => {
                item = gatherFields(values)
                var duration = Date.now() - t1 + "ms"
                console.log('extracted item:', duration, item.title)
                return item
            })

        function extractField(key) {
            var path = itemPath + site.itemList.fields[key]
            return extract(path)
        }

        function gatherFields(values){
            return values.reduce((obj, value, i) => {
                var key = fieldKeys[i]
                obj[key] = value;
                return obj;
            }, {});
        }

    }

    function nextPage(){
        pageAction(site.itemList['next-page'])
            .then( log("page: ready") )
    }
}


function extractFeatures(send){
    var t1 = Date.now()
    injectExtractor(site)
        .then(features => {
            var duration = Date.now() - t1 + "ms"
            console.log('extracted features:', duration, features)
            send(features)
        })

}

// ------------------------------- Generic -------------------------------

function extract(path){
    var extractor = text(path) || attr(path)
    return find(extractor.path)
        .then(extractor.getter)
        .catch(ex => {
            console.log('extract: failed:', path)
            return null
        })

    function text(field){
        var match = /^(.*)\/text\(\)$/.exec(field)
        if(match) return {
            path: match[1],
            getter: elm => elm.getText()
        }
    }

    function attr(field){
        var match = /^(.*)\[@(.*)\]$/.exec(field)
        if(match) return {
            path: match[1],
            getter: elm => elm.getAttribute(match[2])
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
    return promise.all(
        arr.map(x => {
            var fx = () => f(x)
            return promise.createFlow(fx)
        }))
}

// ------------------------------- WebSocket -------------------------------

var WebSocket = require('ws');
var wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', function connection(ws) {
    console.log('ws: connected')

    ws.on('message', function incoming(message) {
        console.log('ws: received:', message);
        handle(message, ws)
    });
});

function handle(msg, ws){
    if(msg == 'items') extractItems(send)
    else if(msg == 'features') extractFeatures(send)
    else if(msg == 'quit') driver.quit()

    function send(data) {
        var msg = JSON.stringify(data)
        ws.send(msg)
    }
}


// ------------------------------- Inject code -------------------------------

var fs = require('fs');
var path = require('path');

function injectExtractor(path){
    return inject('extractor', path)
}

function inject(fileName, args){
    var jsonPath = path.join(__dirname, 'injectable', fileName + '.js')
    var content = fs.readFileSync(jsonPath, 'utf8')
    return driver.executeScript(content, args)
}