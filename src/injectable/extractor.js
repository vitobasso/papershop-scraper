// ------------------------------- expand xpath -------------------------------

var indexRegex = /\[\d*\]/

/*
generates xpaths via index combinations for given original xpath
e.g., given:     /div/div[]/ul/li[] (can have any indexes filled in)
      returns:   /div/div[1]/ul/li[1]
                 /div/div[1]/ul/li[2]
                 /div/div[2]/ul/li[1]
                 /div/div[2]/ul/li[2]
*/
function expandXPath(prefix, suffixPattern){
    var parts = suffixPattern.split('/')
        .slice(1) //remove empty node before trailing "/"
    var suffixesParts = expandXPathSuffixes(prefix, parts)
    return suffixesParts
        .map((parts) => parts.join('/'))
        .map((s) => prefix + '/' + s)

    function expandXPathSuffixes(prefix, originalParts, depth=0){
        if(originalParts.length <= 0) return []
        if(prefix && !evaluateXPath(prefix)) return []

        var originalHead = originalParts[0]
        var originalTail = originalParts.slice(1)

        if(!originalHead.match(indexRegex)) {
            return recursiveCall(prefix, originalHead, originalTail, depth) // recursion
        }

        var callForHead = (ithHead) =>
            recursiveCall(prefix, ithHead, originalTail, depth) // recursion
        return iterateXPathIndex(prefix, originalHead, callForHead)
    }

    function recursiveCall(prefix, head, tail, depth) {
        if(tail.length <= 0) return [[head]]
        else {
            var tailPrefix = prefix + '/' + head
            var newTails = expandXPathSuffixes(tailPrefix, tail, depth+1) // recursion
            var newParts = prependToAll(head, newTails)
            return newParts
        }
    }
}


// generates indexes to "current"
// e.g.: given "div[]", generates "div[1]", "div[2]", etc
// counts prefix's children to tell when to stop
function iterateXPathIndex(prefix, current, callback){
    var tag = current.replace(indexRegex, '')
    var total = countChildTags(prefix, tag)
    var results = []
    for(var i=1; i<=total; i++){
        var indexed = replaceFirstXPathIndex(current, i)
        var ithResult = callback(indexed)
        results = results.concat(ithResult)
    }
    return results;

    //replaces only the first occurrence
    function replaceFirstXPathIndex(xpath, i){
        var replacement = '[' + i + ']'
        return xpath.replace(indexRegex, replacement)
    }
}

function countChildTags(xpath, tagName){
    var node = evaluateXPath(xpath)
    if(!node) return 0
    var children = [...node.children]
    var hasSameTag = (n) => n.tagName == tagName.toUpperCase()
    return children.filter(hasSameTag).length
}

function evaluateXPath(xpath) {
    var evaluator = new XPathEvaluator();
    var result = evaluator.evaluate(xpath, document.documentElement, null,XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
}

function prependToAll(head, tails) {
    var prependHead = (tail) => prepend(head, tail)
    return tails.map(prependHead)
}

function prepend(value, array) {
    var newArray = array.slice(0);
    newArray.unshift(value);
    return newArray;
}

// ------------------------------- extract -------------------------------

function extractFeatures(){
    var featurePaths = expandXPath('', site.features.container)
    return featurePaths.map(extractFeature)
                .filter(Boolean)
                .filter(x => x.values.length)

    function extractFeature(path){
        var keyPath = path + site.features.key
        var valuePaths = expandXPath(path, site.features.values)
        var key = extract(keyPath)
        if(!key) return null
        var values = valuePaths.map(extract)
        if(!values) return null
        return {
            key: key,
            values: values.filter(Boolean)
        }
    }
}

function extractItems(){
    var itemPaths = expandXPath('', site.itemList.items)
    return itemPaths.map(extractItem)

    function extractItem(itemPath) {
        var fieldKeys = Object.keys(site.itemList.fields)
        var values = fieldKeys.map(extractField)
//        console.log('extractItem', fieldKeys, values)
        var item = gatherFields(values)
        castPrice(item)
        return item

        function extractField(key) {
            var mapping = site.itemList.fields[key]
            var path = itemPath + mapping.path
            var rawStr = extract(path)
            var fieldValue = convertField(rawStr, mapping.conversion)
//            console.log('extractField', key, path, rawStr, fieldValue)
            return fieldValue

            function convertField(rawStr, conversion){
    //            console.log('convertField', rawStr, conversion)
                if(!conversion || !rawStr) return rawStr
                return convert(rawStr, new RegExp(conversion.from), conversion.to)

                function convert(str, regex, template){
                    if (typeof template === 'string') {
                        return rawStr.replace(regex, template)
                    } else if(typeof template === 'object') {
                        return mapObj(template, v => convert(str, regex, v))
                    }
                }
            }
        }

        function gatherFields(values){
            return values.reduce((obj, value, i) => {
                var key = fieldKeys[i]
                obj[key] = value;
                return obj;
            }, {});
        }

        function castPrice(item){
            if(item.price) item.price.value = parseFloat(item.price.value)
        }
    }
}


function extract(path){
    var extractor = text(path) || attr(path)
    var elm = evaluateXPath(extractor.path)
//    console.log('extract', path, extractor, elm)
    if(!elm) return null
    return extractor.getter(elm)

    function text(field){
        var match = /^(.*)\/text\(\)$/.exec(field)
        if(match) return {
            path: match[1],
            getter: elm => elm.innerText
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

function mapObj(obj, f){
    var result = {}
    Object.keys(obj)
        .forEach(k => result[k] = f(obj[k]))
    return result
}

// ------------------------------- call -------------------------------

console.log('arguments', arguments)
var site = arguments[0][0]
var mode = arguments[0][1]
console.log('site mapping:', site, 'mode:', mode)
if(mode == 'items') return extractItems()
else if(mode == 'features') return extractFeatures()
