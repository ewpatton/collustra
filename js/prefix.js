
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
  lookupUrl: function(url) {
    var deferred = $.Deferred();
    if(/#$/.test(url) || /\/$/.test(url)) {
      // do nothing
    } else if(/#/.test(url)) {
      var index = url.indexOf("#");
      url = url.substring(0, index+1);
    } else if(/\//.test(url)) {
      var index = url.lastIndexOf("/");
      url = url.substring(0, index+1);
    } else {
      throw "Unexpected URL of the form "+url;
    }
    if(url in PrefixHelper.reverse_namespaces) {
      deferred.resolveWith(window, [ PrefixHelper.reverse_namespaces[url] ]);
    } else {
      $.ajax("http://prefix.cc/reverse", {"dataType":"json","data":{"uri":url,"format":"json"}})
        .then(function(response) {
          for(prefix in response) {
            PrefixHelper.namespaces[prefix.toUpperCase()] = response[prefix];
            PrefixHelper.reverse_namespaces[response[prefix]] = prefix.toUpperCase();
          }
          deferred.resolveWith(window, [ prefix.toUpperCase(), response[prefix] ]);
        },function() {
          deferred.resolveWith(window, [ null, null ]);
        });
    }
    return deferred.promise();
  }
};

(function() {
  for(var ns in PrefixHelper.namespaces) {
    PrefixHelper.reverse_namespaces[PrefixHelper.namespaces[ns]] = ns;
  }
})();
