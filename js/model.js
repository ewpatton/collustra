function Resource(uri) {
  this.type = "uri";
  this.value = uri;
  this.properties = {};
}

Resource.prototype.getProperty = function(resOrURI) {
  var uri = resOrURI["uri"] || resOrURI;
  return this.properties[uri];
}

Resource.prototype.addProperty = function(resOrURI, resURIOrString, dt) {
  var prop = resOrURI["uri"] || resOrURI;
  if ( this.properties[prop] === undefined ) {
    this.properties[prop] = [];
  }
  if ( dt === true ) {
    if ( typeof resURIOrString !== "string" ) {
      resURIOrString = resURIOrString.toString();
    }
    this.properties[prop].push({"type":"literal","value":resURIOrString});
  } else if ( dt == false || dt == undefined ) {
    if ( $.isArray(resURIOrString) ) {
      this.properties.push({"type":"list","value":resURIOrString});
    } else {
      resURIOrString = resURIOrString["uri"] || resURIOrString;
      this.properties.push({"type":"uri","value":resURIOrString});
    }
  } else {
    if ( typeof resURIOrString !== "string" ) {
      resURIOrString = resURIOrString.toString();
    }
    this.properties[prop].push({"type":"literal","value":resURIOrString,
                                "datatype":dt});
  }
}

Resource.prototype.clear = function() {
  this.properties = {};
}

function Model() {
  this.resources = {};
}

Model.prototype.getResource = function(uri) {
  return this.resources[uri];
}

Model.prototype.createResource = function(uri) {
  if(this.resources[uri] === undefined) {
    
  }
  return this.resources[uri];
}

Model.prototype.clear = function() {
  this.resources = {};
}

function Query(uri) {
  
}

var App = {
  Endpoints: (function() {
    var items = [];
    return {
      addEndpoint: function(uri, label) {
        items.push({"uri":uri,"label":label});
        $(window).trigger("newendpoint", [uri, label]);
      }
    };
  })(),
  QueryCache: (function() {
    var items {};
    var init = function() {
      $(window).bind("queryload", function(event, uri, text) {
        items[uri] = text;
      });
    };
    return {
      getQueryFromURI: function(uri) {
        if(uri in items) {
          $(window).trigger("queryload", [uri, items[uri]]);
          return $.Deferred().resolveWith(window, [uri, items[uri]]).promise();
        }
        return $.ajax(uri,
          {"async": true,
           "success": function(data, status, jqxhr) {
             $(window).trigger("queryload", [uri, data]);
           }, "error": function(jqxhr, status, error) {
             $(window).trigger("queryload_failed", [uri, error]);
           }});
      }
    };
  })(),
  QueryList: (function() {
    var items = [];
    return {
      loadQueriesFromEndpoint: function(endpoint) {
        var deferred = $.deferred();
        App.QueryCache.getQueryFromURI("describe-spin.rq").then(function() {
          $.ajax(uri,
            {"async": true,
             "success": function(data) {
               $(window).trigger("endpoint_queries_loaded", [uri, data]);
               deferred.resolveWith(window, [uri, data]);
             }, "error": function(jqxhr, status, error) {
               $(window).trigger("endpoint_queries_failed", [uri, error]);
               deferred.resolveWith(window, [uri, error]);
             }});
        });
        return deferred;
    };
  })(),
  init: function() {
    $(window).bind("newendpoint", App.QueryList.loadQueriesFromEndpoint);
  }
};
