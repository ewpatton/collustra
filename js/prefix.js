
var PrefixHelper = {
  namespaces: {
    "RDF": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    "RDFS": "http://www.w3.org/2000/01/rdf-schema#",
    "OWL": "http://www.w3.org/2002/07/owl#",
    "SP": "http://spinrdf.org/sp#",
    "XSD": "http://www.w3.org/2001/XMLSchema#",
    "FOAF": "http://xmlns.com/foaf/0.1/",
    "SIOC": "http://rdfs.org/sioc/ns#",
    "DC": "http://purl.org/dc/terms/",
    "GEO": "http://www.w3.org/2003/01/geo/wgs84_pos#",
    "TIME": "http://www.w3.org/2006/time#"
  },
  reverse_namespaces: {},
  prefix_cc_lookup: {},
  reverseMap: function(map) {
    var result = {};
    for(var ns in map) {
      if(map.hasOwnProperty(ns)) {
        result[map[ns]] = ns;
      }
    }
    return result;
  },
  lookupUrl: function(url) {
    var deferred = $.Deferred();
    if(!/#$/.test(url) && !/\/$/.test(url)) {
      var index = null;
      if(/#/.test(url)) {
        index = url.indexOf("#");
        url = url.substring(0, index+1);
      } else if(/\//.test(url)) {
        index = url.lastIndexOf("/");
        url = url.substring(0, index+1);
      } else {
        throw "Unexpected URL of the form "+url;
      }
    }
    if(url in PrefixHelper.reverse_namespaces) {
      deferred.resolveWith(window, [ PrefixHelper.reverse_namespaces[url] ]);
    } else {
      $.ajax("http://prefix.cc/reverse",
             {"dataType":"json","data":{"uri":url,"format":"json"}})
        .then(function(response) {
          for(var prefix in response) {
            if(response.hasOwnProperty(prefix)) {
              PrefixHelper.namespaces[prefix.toUpperCase()] = response[prefix];
              PrefixHelper.reverse_namespaces[response[prefix]] =
                prefix.toUpperCase();
            }
          }
          deferred.resolveWith(window, [ prefix.toUpperCase(),
                                         response[prefix] ]);
        },function() {
          deferred.resolveWith(window, [ null, null ]);
        });
    }
    return deferred.promise();
  },
  compact: function(uri, namespaces) {
    if( !namespaces ) {
      namespaces = PrefixHelper.prefix_cc_lookup;
    } else {
      namespaces = PrefixHelper.reverseMap(namespaces);
    }
    var idx, base;
    if(/#/.test(uri)) {
      idx = uri.indexOf("#")+1;
      base = uri.substring(0, idx);
      if(base in namespaces) {
        return namespaces[base].toLowerCase() + ":" + uri.substring(idx);
      }
    } else {
      idx = uri.lastIndexOf("/")+1;
      base = uri.substring(0, idx);
      if(base in namespaces) {
        return namespaces[base].toLowerCase() + ":" + uri.substring(idx);
      }
    }
  },
  curieObject: function(uri, namespaces) {
    if( !namespaces ) {
      namespaces = PrefixHelper.prefix_cc_lookup;
    } else {
      namespaces = PrefixHelper.reverseMap(namespaces);
    }
    var idx, base;
    if(/#/.test(uri)) { 
      idx = uri.lastIndexOf("#")+1;
    } else {
      idx = uri.lastIndexOf("/")+1;
    }
    base = uri.substring(0, idx);
    if(base in namespaces) {
      return {"prefix": namespaces[base], "prefixUri": base,
              "local": uri.substring(idx)};
    } else {
      return {"prefix": null, "prefixUri": base,
              "local": uri};
    }
  }
};

(function() {
  PrefixHelper.reverse_namespaces =
    PrefixHelper.reverseMap(PrefixHelper.namespaces);
})();

$.ajax("http://prefix.cc/popular/all.file.json")
  .then(function(data) {
    for(var prefix in data) {
      if ( data.hasOwnProperty(prefix) ) {
        var uri = data[prefix];
        if ( PrefixHelper.prefix_cc_lookup[uri] === undefined ) {
          PrefixHelper.prefix_cc_lookup[uri] = prefix;
        }
      }
    }
  })
  .fail(function(jqxhr) {
    return "Unexpected error: "+jqxhr.statusText;
  });
