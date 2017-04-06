var scraper = require('./scraper.js')
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
    var endpoints = {
        "list-sources": () => scraper.listSources(respondFor(ws)),
        "change-source": () => scraper.changeSource(msg.params, respondFor(ws)),
        "items": () => scraper.extractItems(msg.params, respondFor(ws)),
        "features": () => scraper.extractFeatures(msg.params, respondFor(ws))
    }
    endpoints[msg.subject]()
}

function respondFor(ws){
    return (subject, data, params) => {
        var jsonMsg = {
            subject: subject,
            params: params, // echo received params
            content: data
        }
        strMsg = JSON.stringify(jsonMsg)
        ws.send(strMsg)
    }
}
