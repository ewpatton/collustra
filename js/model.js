var store = new rdfstore.Store({name:"rdfstore"},function(){});
var queries = new rdfstore.Store({name:"querystore"},function(){});

var rdfListToArray = function(store, graph, head) {
  var result = [];
  var rdfFirst = store.rdf.createNamedNode(RDF.first);
  var rdfRest = store.rdf.createNamedNode(RDF.rest);
  while ( head.nominalValue != RDF.nil ) {
    var triples = graph.match(head, rdfFirst, null).toArray();
    result.push(triples[0].object);
    triples = graph.match(head, rdfRest, null).toArray();
    head = triples[0].object;
  }
  return result;
}

var QueryType = {
  "Select": 0,
  "Construct": 1,
  "Describe": 2,
  "Ask": 3,
  "InsertData": 4,
  "DeleteData": 5,
  "Modify": 6,
  "Load": 7,
  "Clear": 8,
  "Create": 9,
  "Load": 10
};

function Query(uri, type) {
  this.uri = uri;
  this.type = type;
  this.where = [];
  this.order = [];
  this.product = [];
  this.deletes = [];
  this.target = null;
}

Query.prototype.clone = function() {
  
}

var App = {
  Endpoints: (function() {
    /**
     * Stores the set of endpoints loaded into the application
     */
    var items = {};
    return {
      /**
       * Gets the endpoint object for a specific URI if the endpoint is loaded,
       * otherwise the method returns null.
       * @param uri A URI naming a SPARQL endpoint.
       * @return An object with the label and comment for the endpoint,
       * otherwise null.
       */
      getEndpoint: function(uri) {
        return items[uri];
      },
      /**
       * Adds a SPARQL endpoint description to the set of endpoints.
       * @param uri URI naming the SPARQL endpoint.
       * @param label Human-readable label for the endpoint used in the UI.
       * @param comment A descriptive comment to help users understand
       * the purpose of the query.
       * @param deferred A jQuery Deferred object that will be deferred by
       * the addEndpoint method once its internal state has been updated.
       * @event Triggers the new_endpoint event.
       */
      addEndpoint: function(uri, label, comment, deferred) {
        if(typeof comment == "object") {
          // no comment, comment field contains the deferred object
          deferred = comment;
          comment = null;
        }
        items[uri] = {"uri":uri, "label":label};
        if( comment ) {
          items[uri].comment = comment;
        }
        $(window).trigger("new_endpoint", [ uri ]);
        if( deferred != null ) {
          deferred.resolveWith(window, [ uri ]);
        }
      },
      /**
       * Updates the information about an endpoint.
       * @param 
       */
      updateEndpoint: function(oldUri, newUri, newLabel, newComment) {
        if( !items[oldUri] ) {
          throw "URI not defined.";
        }
        items[oldUri].uri = newUri;
        items[oldUri].label = newLabel;
        items[oldUri].comment = newComment;
        if ( oldUri != newUri ) {
          items[newUri] = items[oldUri];
          delete items[oldUri];
        }
        $(window).trigger("updated_endpoint", oldUri, newUri);
      },
      removeEndpoint: function(uri) {
        if(items[uri] != undefined) {
          delete items[uri];
        }
        $(window).trigger("removed_endpoint", [uri]);
      },
      loadEndpointDescription: function(uri) {
        var deferred = $.Deferred();
        store.load("remote", uri, function(success, numTriples) {
          if(success) {
            store.graph(function(success, graph) {
              var arr = graph.match(null, store.rdf.createNamedNode(SD.endpoint),
                                    store.rdf.createNamedNode(uri)).toArray();
              var subj = uri;
              if(arr.length > 0) {
                subj = arr[0].subject.value || arr[0].subject.nominalValue;
              }
              var node = store.rdf.createNamedNode(subj);
              arr = graph.match(node, store.rdf.createNamedNode(RDFS.label)).toArray();
              var label = "";
              if(arr.length > 0) {
                label = arr[0].object.value || arr[0].object.nominalValue;
              }
              var comment = "";
              arr = graph.match(node, store.rdf.createNamedNode(RDFS.comment)).toArray();
              if(arr.length > 0) {
                comment = arr[0].object.value || arr[0].object.nominalValue;
              }
              if ( label != "" ) {
                App.Endpoints.addEndpoint(uri, label, comment, deferred);
                return deferred.promise();
              } else {
                deferred.reject();
              }
            });
          } else {
            deferred.reject();
          }
        });
        return deferred.promise();
      }
    };
  })(),
  QueryCache: (function() {
    var items = {};
    var init = function() {
      $(window).bind("queryload", function(event, uri, text) {
        items[uri] = text;
      });
    };
    init();
    return {
      getQueries: function() {
        return items;
      },
      getQueryFromURI: function(uri) {
        var deferred = $.Deferred();
        if(uri in items) {
          $(window).trigger("queryload", [uri, items[uri]]);
          return $.Deferred().resolveWith(window, [uri, items[uri]]).promise();
        }
        $.ajax(uri,
          {"async": true,
           "success": function(data, status, jqxhr) {
             $(window).trigger("queryload", [uri, data]);
             deferred.resolveWith(window, [uri, data]);
           }, "error": function(jqxhr, status, error) {
             $(window).trigger("queryload_failed", [uri, error]);
             deferred.rejectWith(window, [uri, error]);
           }});
        return deferred.promise();
      }
    };
  })(),
  ConceptList: (function() {
    var concepts = {
    };
    return {
      loadConceptsFromEndpoint: function() {
        
      }
    };
  })(),
  QueryList: (function() {
    var items = {};
    var getProjectionInfo = function(endpoint, uri, graph, node) {
      var spVarName = queries.rdf.createNamedNode(SP.varName);
      var rdfsLabel = queries.rdf.createNamedNode(RDFS.label);
      var rdfsComment = queries.rdf.createNamedNode(RDFS.comment);
      var info = {};
      if(node['nominalValue'] == undefined) {
        info["uri"] = uri+";bn="+node.nominalValue;
      } else {
        info["uri"] = node.nominalValue;
      }
      info["endpoint"] = endpoint;
      var triples = graph.match(node, spVarName, null).toArray();
      if(triples.length > 0) {
        info["name"] = triples[0].object.nominalValue;
      }
      triples = graph.match(node, rdfsLabel, null).toArray();
      if(triples.length > 0) {
        info["label"] = triples[0].object.nominalValue;
      }
      triples = graph.match(node, rdfsComment, null).toArray();
      if(triples.length > 0) {
        info["comment"] = triples[0].object.nominalValue;
      }
      return info;
    };
    var updateItems = function( endpoint, queries, deferred ) {
      var query = "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> "+
        "PREFIX sp: <http://spinrdf.org/sp#> SELECT ?uri ?label ?comment "+
        "WHERE { GRAPH <"+endpoint+"> { ?uri a sp:Query ; rdfs:label ?label "+
        "; rdfs:comment ?comment . }} ORDER BY ASC(?label)";
      queries.execute(query, function(success, solutions) {
        if ( !success ) {
          deferred.rejectWith(window, [ endpoint, store, solutions ]);
          return;
        }
        var queryUris = [];
        queries.graph(endpoint, function(success, graph) {
          var spResults = queries.rdf.createNamedNode(SP.resultVariables);
          var rdfFirst = queries.rdf.createNamedNode(RDF.first);
          var rdfRest = queries.rdf.createNamedNode(RDF.rest);
          $.each(solutions, function(i, solution) {
            var uri = solution["uri"].value;
            var uriNode = queries.rdf.createNamedNode(uri);
            var label = solution["label"].value;
            var comment = solution["comment"] ? solution["comment"].value : null;
            items[uri] = {"uri": uri, "label": label, "endpoint": endpoint};
            if( comment ) { items[uri]["comment"] = comment; }
            var projections = [];
            var triples = graph.match(uriNode, spResults, null).toArray();
            if( triples.length > 0 ) {
              var vars = rdfListToArray(queries, graph, triples[0].object);
              $.each(vars, function(j, v) {
                projections.push(getProjectionInfo(endpoint, uri, graph, v));
              });
            }
            items[uri].projections = projections;
            queryUris.push(uri);
          });
        });
        deferred.resolveWith(window, [ endpoint, store, queryUris ]);
      });
    }
    return {
      getQueries: function() {
        return items;
      },
      loadQueriesFromEndpoint: function(endpoint) {
        var deferred = $.Deferred();
        App.QueryCache.getQueryFromURI("queries/describe-spin.rq")
          .then(function(success, query) {
            var queryUri = [endpoint];
            queryUri[1] = /\?/.test( endpoint ) ? "&" : "?";
            queryUri[2] = "query=";
            queryUri[3] = encodeURIComponent( query );
            queries.execute("LOAD <"+queryUri.join("")+
                            "> INTO GRAPH <"+endpoint+">",
                            function(success, error) {
                              if ( success ) {
                                updateItems( endpoint, queries, deferred );
                              } else {
                                deferred.rejectWith( window, [ error ] );
                              }
                            });
          }, function(success, error) {
            deferred.rejectWith(window, [ error ]);
          });
        return deferred.promise();
      }
    };
  })(),
  QueryCanvas: (function() {
    var items = {};
    return {
      instantiate: function(uri) {
        // hash to get a reasonably small identifier. collision is unlikely.
        var key = md5(uri);
        if ( items[key] == undefined ) {
          items[key] = [];
        }
      },
      destroy: function(queryId) {
      }
    };
  })(),
  init: function() {
  }
};
