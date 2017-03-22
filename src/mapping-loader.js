var fs = require('fs');
var path = require('path');

exports.load = (site) => {
    var fileName = site + '.json'
    var jsonPath = path.join(__dirname, '..', 'mappings', fileName);
    var content = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(content)
}
