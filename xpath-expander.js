
exports.expand = (path) => {
    var nodes = path.split('/')
    return expandNodes(nodes)
}

function expandNodes(nodes){
   if(nodes.length == 0) return []
   var head = nodes[0]
   var tail = nodes.slice(1)
   var suffixes = expandNodes(tail)
   var prependSuffixes = prefix => prependToAll(prefix + '/', suffixes)
   return flatten(expandNode(head).map(prependSuffixes))
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
