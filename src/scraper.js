var xpath = require('./xpath-expander.js')
var loader = require('./mapping-loader.js')

var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;
var driver = require('./driver/phantomjs').driver

var timeout = 10 * 000 // millis
var site = loader.load('ebay')

var itemPathPattern = site.structure.container + site.structure.itemPattern
var itemPaths = xpath.expand(itemPathPattern)
var log = (s) => () => console.log(s)

Promise.all(site.steps.map(pageAction))
    .then( log("page: ready") )

function scrapePage(send){
    Promise.all(itemPaths.map(extractFields))
        .then((items) => {
            pageAction(site['next-page'])
                .then( log("page: ready") )
            send(items)
        })
}

function pageAction(action){
    console.log('action', action)
    if(action.type == 'go') return driver.get(action.value)
    if(action.type == 'click') return driver.findElement(By.xpath(action.target)).click();
    if(action.type == 'type') return driver.findElement(By.xpath(action.target)).sendKeys(action.value);
    console.err('unknown action', action)
}

function extractFields(itemPath) {
    var fieldKeys = Object.keys(site.structure.fields)
    var fieldPromises = fieldKeys.map(extractField)
    return Promise.all(fieldPromises).then( (values) => {
        item = gatherFields(values)
        console.log('extracted item: ', item.title)
        return item
    })

    function extractField(key) {
        var field = site.structure.fields[key]
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
    driver.wait(until.elementLocated(locator), timeout)
    return driver.findElement(By.xpath(path))
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
        scrapePage(send)
    } else if(msg == 'quit') driver.quit()
}

