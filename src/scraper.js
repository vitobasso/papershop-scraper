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
    if(action.type == 'click') return find(action.target).click();
    if(action.type == 'type') return find(action.target).sendKeys(action.value);
    console.err('unknown action', action)
}

function find(path){
    var timeout = 20000 //ms
    var locator = By.xpath(path)
    driver.wait(until.elementLocated(locator), timeout)
    return driver.findElement(locator)
}

function extractItems(send){
    injectExtractor(site, 'items')
        .then(items => {
            console.log('extracted items')
            nextPage()
            send('items', items)
            send('features', getFeatures(items))
        })

    function nextPage(){
        pageAction(site.itemList['next-page'])
            .then( log("page: ready") )
    }

    function getFeatures(items){ //TODO array of {key, values}
        var mapping = site.itemList.fields
        var featureKeys = Object.keys(mapping)
            .filter(k => mapping[k].feature)
        var result = items.reduce(includeItemFields, {})
        result = featureKeys.map(k => ({
            key: k,
            values: [...result[k]] //convert from Set to array
        }))
        console.log('getFeatures', result)
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
    }
}


function extractFeatures(send){
    injectExtractor(site, 'features')
        .then(features => {
            console.log('extracted features')
            send('features', features)
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
    if(msg == 'items') extractItems(sender(ws))
    else if(msg == 'features') extractFeatures(sender(ws))
    else if(msg == 'quit') driver.quit()
}

function sender(ws){
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
    var jsonPath = path.join(__dirname, 'injectable', fileName + '.js')
    var content = fs.readFileSync(jsonPath, 'utf8')
    return driver.executeScript(content, args)
}