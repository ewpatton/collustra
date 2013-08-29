/**
 * @overview
 * App.js provides the application model for Collustra. It triggers a number of
 * events that can be responded to in other components, such as the view system.
 * @copyright © 2013 Evan W. Patton
 * @license
 * Released under the MIT license
 * {@link https://raw.github.com/ewpatton/collustra/master/LICENSE}
 * @file
 */

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
     * @private
     * @memberof App.Endpoints
     */
    var items = {};

    var loadEndpointCallback = function(uri, deferred, proxy) {
      return function(success, numTriples) {
        var rdf = store.rdf;
        var process = function() {
          store.graph(function(success, graph) {
            var arr = graph.match(null, rdf.createNamedNode(SD.endpoint),
                                  rdf.createNamedNode(uri)).toArray();
            var subj = uri;
            if(arr.length > 0) {
              subj = arr[0].subject.value || arr[0].subject.nominalValue;
            }
            var node = rdf.createNamedNode(subj);
            arr = graph.match(node, rdf.createNamedNode(RDFS.label))
              .toArray();
            var label = "";
            if(arr.length > 0) {
              label = arr[0].object.value || arr[0].object.nominalValue;
            }
            var comment = "";
            arr = graph.match(node, rdf.createNamedNode(RDFS.comment))
              .toArray();
            if(arr.length > 0) {
              comment = arr[0].object.value || arr[0].object.nominalValue;
            }
            if ( label != "" ) {
              App.Endpoints.addEndpoint(uri, label, comment, deferred);
              App.Endpoints.getEndpoint(uri).useProxy = proxy;
              return deferred.promise();
            } else {
              // TODO remove this workaround for a logic bug
              deferred.reject();
              return;
              // TODO this is the "correct" code
              if ( !proxy ) {
                deferred = App.Endpoints
                  .loadEndpointDescription(uri, deferred, true);
              } else {
                deferred.reject();
              }
            }
          });
        }
        if(success) {
          process();
        } else {
          // TODO remove this workaround for a logic bug
          deferred.reject();
          return;
          // TODO this is the "correct" code
          if ( !proxy ) {
            $.ajax(uri,
                   {"data":{"query":"describe <"+uri+">"},
                    "headers":{"Accept":"text/turtle"}})
              .then(function(data, status, jqxhr) {
                store.load("text/turtle", data,
                           function(success, result) {
                             if ( success ) {
                               process();
                             } else {
                               console.log(result);
                               deferred.reject();
                             }
                           });
                return deferred;
              }, function(jqxhr, status, error) {
                if ( error == "rejected" ) {
                  return App.Endpoints
                    .loadEndpointDescription(uri, deferred, true);
                } else {
                  deferred.reject();
                  return deferred;
                }
              });
          } else {
            deferred.reject();
          }
        }
        return deferred;
      };
    };

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
      loadEndpointDescription: function(uri, deferred, proxy) {
        var deferred = deferred || $.Deferred();
        if ( proxy ) {
          return $.ajax("http://logd.tw.rpi.edu/sparql",
                        {"data":{"query":"describe <"+uri+">",
                                 "service-uri":uri,
                                 "query-option":"text",
                                 "output":"rdfn3"},
                         "headers":{"Accept":"text/turtle"}})
            .then(function(data, status, jqxhr) {
              store.load("text/turtle", data,
                         function(success, results) {
                           deferred =
                             loadEndpointCallback(uri, deferred, proxy);
                         });
              return deferred.promise();
            }, function(jqxhr, status, error) {
              console.log(error);
              deferred.reject();
              return deferred.promise();
            });
        }
        var rdf = store.rdf;
        store.load("remote", uri, loadEndpointCallback(uri, deferred, proxy));
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
            var label = solution["label"].value;
            var comment = solution["comment"] ? solution["comment"].value
              : null;
            var query = Query.fromSPIN( queries, graph, uri );
            query.label = label;
            query.endpoint = endpoint;
            if ( comment ) {
              query.comment = comment;
            }
            items[uri] = query;
            queryUris.push(uri);
            return;
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
      getQuery: function(uri) {
        return items[uri];
      },
      getQueries: function() {
        return items;
      },
      loadQueriesFromEndpoint: function(endpoint, proxy) {
        var deferred = $.Deferred();
        App.QueryCache.getQueryFromURI("queries/describe-spin.rq")
          .then(function(success, query) {
            var queryUri = [endpoint];
            queryUri[1] = /\?/.test( endpoint ) ? "&" : "?";
            if ( proxy != undefined ) {
              queryUri = [ "http://logd.tw.rpi.edu/sparql" ];
              queryUri[1] = "?";
            }
            queryUri[2] = "query=";
            queryUri[3] = encodeURIComponent( query );
            if ( proxy != undefined ) {
              queryUri[4] = "&service-uri=";
              queryUri[5] = encodeURIComponent( endpoint );
              queryUri[6] = "&output=xml";
            }
            queries.execute("LOAD <"+queryUri.join("")+
                            "> INTO GRAPH <"+endpoint+">",
                            function(success, error) {
                              console.log("test");
                              if ( success ) {
                                updateItems( endpoint, queries, deferred );
                              } else {
                                console.log("test");
                                deferred.rejectWith( window, [ error ] );
                              }
                            });
          }, function(success, error) {
            console.log("test");
            if( !proxy && typeof success === "object" ) {
              if ( success.state && success.state() == "rejected" ) {
                return App.QueryList.loadQueriesFromEndpoint( endpoint, proxy );
              }
            }
            deferred.rejectWith(window, [ error ]);
          });
        return deferred.promise();
      }
    };
  })(),
  /**
   * @class
   * @memberof App
   * @classdesc
   * QueryCanvas provides the core model for the application by maintaining a
   * collection of query instances cloned from external SPARQL endpoints. It
   * provides operations to manipulate those queries and will notify other
   * components in the system of changes to the internal model using the jQuery
   * event triggering mechanism.
   */
  QueryCanvas: (function() {
    /**
     * A dictionary that maps the MD5 of a query URI to an array of instances
     * of that query.
     * @memberof App.QueryCanvas
     * @private
     */
    var items = {};
    return {
      /**
       * Given a query identifier, this method will return the underlying query
       * instance matching the identifier.
       * @param {string} queryId A query identifier returned by
       * {@link #instantiate}
       * @returns {Query} A query object
       * @seealso Query
       * @memberof App.QueryCanvas
       */
      getQuery: function(queryId) {
        var idx = queryId.lastIndexOf("_");
        var queryArray = items[queryId.substr(0, idx)];
        var index = parseInt(queryId.substr(idx+1));
        return queryArray[index];
      },
      /**
       * Instantiates a new {@link Query} object for a given URI using the SPIN
       * description for the URI in the local query RDF store. Each call to this
       * method will return a unique identifier that can be used with other
       * methods defined by App.QueryCanvas.
       * @param {string} uri A URI for a SPARQL query encoded in SPIN that has
       * been loaded into the {@link queries query store}.
       * @returns {string} A identifier unique to the new query instantiation.
       * @memberof App.QueryCanvas
       */
      instantiate: function(uri) {
        // hash to get a reasonably small identifier. collision is unlikely.
        var key = md5(uri);
        if ( items[key] == undefined ) {
          items[key] = [];
        }
        var queryId = key + "_" + items[key].length;
        var query = App.QueryList.getQuery(uri).clone();
        query.queryId = queryId;
        items[key].push( query );
        return queryId;
      },
      /**
       * Destroys the query object associated with the given queryId.
       * @todo needs implementation
       * @param {string} queryId A query identifier returned by
       * {@link #instantiate}
       * @memberof App.QueryCanvas
       */
      destroy: function(queryId) {
      },
      /**
       * Reorders the projections of a query.
       * @param {string} queryId A query identifier returned by
       * {@link #instantiate}
       * @param {Array} order
       * @throws {string} If the order parameter has a different length from the
       * query's projection list, or the order array does not contain the same
       * collection of projections, then a string identifying the first
       * offending projection will be thrown.
       * @memberof App.QueryCanvas
       */
      reorderProjections: function(queryId, order) {
        var query = App.QueryCanvas.getQuery( queryId );
        var map = $.map(order, function(x) { return query.getVariable(x); });
        var checker = {};
        $.each(query.projections, function(i, v) {
          checker[v.varName] = 1;
        });
        $.each(map, function(i, v) {
          checker[v.varName]--;
        });
        for ( var key in checker ) {
          if ( checker[key] != 0 ) {
            throw "Variable name not in new ordering: " + key;
          }
        }
        query.projections = map;
        $(window).trigger("projection_changed", [ queryId ] );
      },
      /**
       * Accept two "query" objects of the form:
       * {"query": Query, "variable": Variable}
       */
      join: function(query1, query2) {
        if ( ! ( query1.query instanceof Query ) ) {
          query1.query = App.QueryCanvas.getQuery( query1.query );
        }
        if ( ! ( query1.variable instanceof Query.Variable ) ) {
          query1.variable = query1.query.getVariable( query1.variable );
        }
        if ( ! ( query2.query instanceof Query ) ) {
          query2.query = App.QueryCanvas.getQuery( query2.query );
        }
        if ( ! ( query2.variable instanceof Query.Variable ) ) {
          query2.variable = query2.query.getVariable( query2.variable );
        }
        // create joined query
        var joinQuery = new Query.JoinedQuery(query1, query2);
        var newKey = md5( joinQuery.uri );
        if ( items[newKey] == undefined ) {
          items[newKey] = [];
        }
        var newQueryId = newKey + "_" + items[newKey].length;
        joinQuery.queryId = newQueryId;
        items[newKey].push( joinQuery );
        console.log(joinQuery);
        window.tempQuery = joinQuery;
        // remove old query2
        $(window).trigger( "removed_query", [ query2.query.queryId ]);
        // update old query1 with new queryId
        $(window).trigger( "updated_query", [ query1.query.queryId,
                                              newQueryId ]);
      }
    };
  })(),
  CommandStack: (function() {
  })(),
  init: function() {
  }
};
