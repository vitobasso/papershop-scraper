var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
    promise = webdriver.promise
var driver = require('./driver/firefox').driver

var site = loader.load('ebay')
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
    injectExtractor(site, 'items')
        .then(items => {
            console.log('extracted items')
            nextPage()
            send(items)
        })

    function nextPage(){
        pageAction(site.itemList['next-page'])
            .then( log("page: ready") )
    }
}


function extractFeatures(send){
    injectExtractor(site, 'features')
        .then(features => {
            console.log('extracted features')
            send(features)
        })
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

function injectExtractor(mapping, mode){
    return inject('extractor', [mapping, mode])
}

function inject(fileName, args){
    console.log('inject', args)
    var jsonPath = path.join(__dirname, 'injectable', fileName + '.js')
    var content = fs.readFileSync(jsonPath, 'utf8')
    return driver.executeScript(content, args)
}