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
    if(msg.subject == 'items') scraper.extractItems(msg.params, respondFor(ws))
    else if(msg.subject == 'features') scraper.extractFeatures(msg.params, respondFor(ws))
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
