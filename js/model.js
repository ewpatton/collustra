/**
 * @overview
 * Model.js provides the query object model and the underlying application
 * model for Collustra. It triggers a number of events that can be responded
 * to in other components, such as the view system.
 *
 * @copyright © 2013 Evan W. Patton
 * @license
 * Released under the MIT license
 * {@link https://raw.github.com/ewpatton/collustra/master/LICENSE}
 *
 * @file
 */

/** Stores the SPARQL endpoint descriptions **/
var store = new rdfstore.Store({name:"rdfstore"},function(){});

/** Stores the SPARQL descriptions (using SPIN) **/
var queries = new rdfstore.Store({name:"querystore"},function(){});

/**
 * Traverses an rdf:List in the specified graph and converts it into a
 * JavaScript array for the purposes of iteration. This method assumes that the
 * list is well formed, specifically that starting from the root, each node has
 * exactly one rdf:first element and exactly one rdf:rest element that either
 * points to another rdf:List or points to rdf:nil. It will fail in the event
 * that the list structure is not a tree (i.e. there is a cycle in the list).
 * @param store An instance of rdfstore.Store that contains the list description
 * @param graph A graph describing the list
 * @param head Head element of the list to transform
 * @returns A JavaScript array containing the elements in the rdf:List
 */
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

/**
 * @class
 * @classdesc QueryType is an enumeration of the different SPARQL query types
 */
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

/**
 * The Query object is used to represent and manipulate SPARQL queries using
 * the JavaScript Object Notation (JSON). The prototype function provides a
 * number of useful functions for manipulating queries as well as converting
 * them between different formats (specifically SPARQL and SPIN).
 * @param uri URI identifying the new Query object
 * @param type The type of query modeled; see also {@link QueryType}
 * @constructor
 * @todo Finish issue https://github.com/ewpatton/collustra/issues/8
 */
function Query(uri, type) {
  this.uri = uri;
  this.type = type;
  this.projections = [];
  this.where = [];
  this.order = [];
  this.product = [];
  this.deletes = [];
  this.target = null;
  this.variables = {};
}

(function() {
/**
 * Processes a SELECT query from a SPIN description in RDF.
 * @memberof Query
 * @private
 * @param {rdfstore.Store} store
 * @param {rdfstore.Graph} graph
 * @param {Query} query
 * @todo not yet complete
 */
var processSelectQuery= function(store, graph, query) {
  var qnode = store.rdf.createNamedNode(query.uri);
  var vars = graph.match(qnode, store.rdf.createNamedNode(SP.resultsVariables))
    .toArray();
  for(var i=0; i<vars.length; i++) {
    var name = graph.match(vars[i], store.rdf.createNamedNode(SP.varName))
      .toArray();
    query.projects.push(new Query.Variable(vars[i].nominalValue,
                                           name[0].nominalValue));
  }
  var where = graph.match(qnode, store.rdf.createNamedNode(SP.where)).toArray();
  var subj = store.rdf.createNamedNode(SP.subject);
  var pred = store.rdf.createNamedNode(SP.predicate);
  var obj = store.rdf.createNamedNode(SP.object);
  where = rdfListToArray(store, graph, where[0]);
  for(var i=0; i<where.length;i ++) {
    var triple = where[i];
    var s = graph.match(triple, subj).toArray();
    var p = graph.match(triple, pred).toArray();
    var o = graph.match(triple, obj).toArray();
  }
};

/**
 * Creates a new Query object from a SPIN description stored in the specified
 * store and graph and identified by the given URI.
 * @param store An instance of rdfstore.Store
 * @param graph A graph containing the SPIN description in store
 * @param uri URI of the SPIN query to convert into a Query object
 * @returns A new instance of Query containing a representation of the SPIN
 * query
 * @throws Exception if the SPIN description is invalid
 */
Query.fromSPIN = function(store, graph, uri) {
  var qnode = store.rdf.createNamedNode(uri);
  var type = store.rdf.createNamedNode(RDF.type);
  var types = graph.match(qnode, type).toArray();
  var queryType = null;
  var query = null;
  for(var i=0; i<types.length; i++) {
    var t = types[i];
    if(t.nominalValue == SP.Query) continue;
    if(t.nominalValue.indexOf(SP.NS) === 0) {
      switch(t.nominalValue) {
      case SP.Select:
        query = new Query(uri, QueryType.Select);
        processSelectQuery(store, graph, query);
        break;
      default:
        throw "Only accepts Select queries."
      }
      break;
    }
  }
  if(query == null) {
    throw "No query type found. Aborting.";
  }
  return query;
}})();

/**
 * @class Variable
 * @memberof Query
 * @classdesc
 * Variable
 */
Query.Variable = function(uri, varName) {
  this.uri = uri;
  this.varName = varName;
}

Query.Variable.prototype.toString = function() {
  return "?" + this.varName;
}

Query.Resource = function(uri) {
  this.uri = uri;
}

Query.Resource.prototype.toString = function(namespaces) {
  var curie = PrefixHelper.compact(this.uri, namespaces);
  return curie || "<" + this.uri + ">";
}

Query.GraphComponent = function() {
}

Query.BasicGraphPattern = function(subj, pred, obj) {
  Query.GraphComponent.call(this);
  this.subject = subj;
  this.predicate = pred;
  this.object = obj;
}

Query.BasicGraphPattern.prototype.toString = function(previous) {
  if(previous instanceof Query.BasicGraphPattern) {
    if(previous.subject == this.subject) {
      if(previous.predicate == this.predicate) {
        return ", " + this.object.toString() + " ";
      } else {
        return ";\n  " + (this.predicate.uri == RDF.type ? " a " :
                           this.predicate.toString()) +
          " " + this.object.toString() + " ";
      }
    } else {
      return ".\n" + this.subject.toString() + " " +
        (this.predicate.uri == RDF.type ? " a " : this.predicate.toString()) +
        " " + this.object.toString() + " ";
    }
  } else {
    if(this.predicate.uri == RDF.type) {
      return this.subject.toString() + " a " + this.object.toString();
    } else {
      return this.subject.toString() + " " +
        this.predicate.toString() + " " +
        this.object.toString() + " "
    }
  }
}

Query.prototype.clone = function() {
}

/**
 * @namespace
 * App
 */
var App = {
  /**
   * @class
   * @classdesc
   * App.Endpoints provides static methods for manipulating the collection of
   * endpoints available in the current workspace.
   */
  Endpoints: (function() {
    /**
     * Stores the set of endpoints loaded into the application
     */
    var items = {};
    return {
      /**
       * Gets the endpoint object for a specific URI if the endpoint is loaded,
       * otherwise the method returns null.
       * @memberof App.Endpoints
       * @static
       * @param {string} uri A URI naming a SPARQL endpoint.
       * @return {Object|null} An object with the label and comment for the
       * endpoint, otherwise null.
       */
      getEndpoint: function(uri) {
        return items[uri];
      },

      /**
       * Adds a SPARQL endpoint description to the set of endpoints.
       * @memberof App.Endpoints
       * @static
       * @param {string} uri URI naming the SPARQL endpoint.
       * @param {string} label Human-readable label for the endpoint used in
       * the UI.
       * @param {string} [comment=null] A descriptive comment to help users
       * understand the purpose of the query.
       * @param {jQuery.Deferred} [deferred=new jQuery.Deferred()] A jQuery
       * Deferred object that will be resolved by the addEndpoint method once
       * its internal state has been updated.
       * @fires new_endpoint
       * @returns {jQuery.Promise} A promise from a jQuery.Deferred that has
       * been resolved with the endpoint URI. Useful for chaining with other
       * API calls.
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
        /**
         * @event new_endpoint
         * @desc This event is fired with the window as <strong>this</strong>
         * @param event {jQuery.Event} Default jQuery event object
         * @param uri {string} URI of the endpoint added
         */
        $(window).trigger("new_endpoint", [ uri ]);
        if( deferred != null ) {
          deferred.resolveWith(window, [ uri ]);
        }
      },

      /**
       * Updates the information about an endpoint.
       * @memberof App.Endpoints
       * @static
       * @param {string} oldUri
       * @param {string} newUri
       * @param {string} newLabel
       * @param {string} newComment
       * @fires updated_endpoint
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
        /**
         * @event updated_endpoint
         * @desc Fired when an endpoint's information is updated
         * @param {jQuery.Event} Default jQuery Event object
         * @param {string} oldUri Old URI of the endpoint
         * @param {string} newUri New URI of the endpoint (if changed)
         */
        $(window).trigger("updated_endpoint", oldUri, newUri);
      },

      /**
       * Removes an endpoint from the endpoint store.
       * @memberof App.Endpoints
       * @static
       * @param {string} uri
       * @fires removed_endpoint
       */
      removeEndpoint: function(uri) {
        if(items[uri] != undefined) {
          delete items[uri];
        }
        /**
         * @event removed_endpoint
         * @desc Fired when an endpoint is removed from the workspace.
         * @param {jQuery.Event} Default jQuery Event object
         * @param {string} uri URI of the endpoint that was removed
         **/
        $(window).trigger("removed_endpoint", [uri]);
      },

      /**
       * Loads the SPARQL Service Description from an endpoint if one exists.
       * @memberof App.Endpoints
       * @static
       * @param {string} uri URI of a SPARQL endpoint
       * @returns {jQuery.Promise} A jQuery Promise object that will be resolved
       * when the HTTP transaction(s) complete with the endpoint and the content
       * of the description is available. The promise will be rejected if the
       * endpoint does not provide a service description (e.g. the service is
       * unavailable, returns a non-200 HTTP status code, or does not contain,
       * at a minimum, an rdfs:label.
       */
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
  /**
   * @class QueryCache
   * @classdesc
   * QueryCache stores a collection of SPARQL queries used to power features of
   * the workspace. This is not the same as the RDF data store, {@see queries},
   * that stores the SPIN descriptions of queries read from external endpoints.
   */
  QueryCache: (function() {
    /**
     * Map of query URIs to query text
     * @private
     */
    var items = {};
    /**
     * Initialization function for the query cache.
     * @private
     */
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
