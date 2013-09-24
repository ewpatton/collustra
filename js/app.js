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
      addEndpoint: function(endpoint, deferred) {
        items[endpoint.uri] = endpoint;
        /**
         * @event new_endpoint
         * @desc This event is fired with the window as <strong>this</strong>
         * @param event {jQuery.Event} Default jQuery event object
         * @param uri {string} URI of the endpoint added
         */
        $(window).trigger("new_endpoint", [ endpoint.uri ]);
        if( deferred !== undefined ) {
          deferred.resolveWith(window, [ endpoint.uri ]);
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
        if ( oldUri !== newUri ) {
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
        if(items[uri] !== undefined) {
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
      loadEndpointDescription: function(uri, deferred) {
        deferred = deferred || $.Deferred();
        var endpoint = new Endpoint(uri);
        endpoint.readDescription(deferred);
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
     * Map of query template URIs to query template text
     * @private
     */
    var templates = {};
    /**
     * Initialization function for the query cache.
     * @private
     */
    var init = function() {
      $(window).bind("queryload", function(event, uri, text) {
        items[uri] = text;
      });
      $(window).bind("querytemplateload", function(event, uri, text) {
        templates[uri] = text;
      });
    };
    init();
    return {
      getQuery: function(uri) {
        if ( uri === undefined ) { 
          return items;
        } else {
          return items[uri];
        }
      },
      getQueryTemplate: function(uri) {
        if ( uri === undefined ) {
          return templates;
        } else {
          return templates[uri];
        }
      },
      getQueryFromURI: function(uri) {
        var deferred = $.Deferred();
        if(uri in items) {
          $(window).trigger("queryload", [uri, items[uri]]);
          return $.Deferred().resolveWith(window, [uri, items[uri]]).promise();
        }
        $.ajax(uri,
          {"async": true,
           "success": function(data) {
             $(window).trigger("queryload", [uri, data]);
             deferred.resolveWith(window, [uri, data]);
           }, "error": function(jqxhr) {
             $(window).trigger("queryload_failed", [uri, jqxhr.statusText]);
             deferred.rejectWith(window, [uri, jqxhr.statusText]);
           }});
        return deferred.promise();
      },
      getQueryTemplateFromURI: function(uri) {
        var deferred = $.Deferred();
        if(uri in templates) {
          $(window).trigger("querytemplateload", [uri, templates[uri]]);
          deferred.resolveWith(window, [uri, templates[uri]]);
        } else {
          $.ajax(uri)
            .done(function(data) {
              $(window).trigger("querytemplateload", [uri, data]);
              deferred.resolveWith(window, [uri, data]);
            }).fail(function(jqxhr) {
              $(window).trigger("querytemplateload_failed", [uri, jqxhr.statusText]);
              deferred.rejectWith(window, [uri, jqxhr.statusText]);
            });
        }
        return deferred.promise();
      }
    };
  })(),
  ConceptList: (function() {
    var ignoreNamespaces = [
      RDF.NS,
      RDFS.NS,
      OWL.NS,
      SP.NS,
      XSD.NS,
      SD.NS,
      "http://www.openlinksw.com/schemas/virtrdf#"
    ];
    var concepts = {
    };
    var conceptsByEndpoint = {
    };
    return {
      getConcept: function(uri) {
        return concepts[uri];
      },
      getConcepts: function() {
        return concepts;
      },
      getConceptQuery: function(uri) {
        return Query.templateForClass(concepts[uri].endpoints[0], uri);
      },
      getConceptsFromEndpoint: function(endpoint) {
        if ( typeof endpoint !== "string" ) {
          endpoint = endpoint.uri;
        }
        return conceptsByEndpoint[endpoint];
      },
      loadConceptsFromEndpoint: function(endpoint) {
        if ( typeof endpoint === "string" ) {
          endpoint = App.Endpoints.getEndpoint(endpoint);
        }
        var deferred = $.Deferred();
        App.QueryCache.getQueryFromURI("queries/describe-concepts.rq")
          .then(function(success, query) {
            if ( !success ) {
              deferred.reject();
              return;
            }
            endpoint.query(query)
              .done(function(data) {
                var bindings = data.results.bindings;
                conceptsByEndpoint[endpoint.uri] = {};
                var newClasses =
                  $.map(bindings, function(binding) {
                    var isNew = false;
                    try {
                      var uri = binding.Concept.value;
                      // not efficient, but it will do for now
                      for(var i = 0; i < ignoreNamespaces.length; i++) {
                        if ( uri.indexOf( ignoreNamespaces[i] ) === 0 ) {
                          return undefined;
                        }
                      }
                      var label = binding.Label ? bindings.Label.value : null;
                      var comment = binding.Comment ? bindings.Comment.value :
                        null;
                      if ( !label ) {
                        label = labelFromUri( uri );
                      }
                      if ( concepts[uri] === undefined ) {
                        concepts[uri] = new Concept(uri);
                        concepts[uri].label = label;
                        isNew = uri;
                      }
                      if ( concepts[uri].comment === undefined &&
                           comment !== undefined ) {
                        concepts[uri].comment = comment;
                      }
                      if ( concepts[uri].endpoints === undefined ) {
                        concepts[uri].endpoints = [];
                      }
                      concepts[ uri ].endpoints.push( endpoint );
                      concepts[ uri ].activeEndpoint = endpoint.uri;
                      conceptsByEndpoint[ endpoint.uri ][ uri ] =
                        concepts[ uri ];
                    } catch(e) {
                      console.warn("Exception while processing concepts:" + e);
                    }
                    return isNew === false ? undefined : isNew;
                  });
                deferred.resolveWith( window, [ endpoint ] );
              })
              .fail(function(jqxhr) {
                deferred.rejectWith(window, [ jqxhr.status,
                                              jqxhr.statusText ]);
              });
          }, function(success, error) {
            if( !proxy && typeof success === "object" && success.state &&
                success.state() === "rejected" ) {
              return App.ConceptList.
                loadConceptsFromEndpoint( endpoint, proxy );
            }
            deferred.rejectWith(window, [ error ]);
          });
        return deferred.promise();
      }
    };
  })(),
  QueryList: (function() {
    var items = {};
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
          if ( !success ) {
            deferred.reject();
            return;
          }
          $.map(solutions, function(solution) {
            var uri = solution["uri"].value;
            var label = solution["label"].value;
            var comment = solution["comment"] ? solution["comment"].value
              : null;
            var query = Query.fromSPIN( queries, graph, uri );
            query.label = label;
            query.addEndpoint( App.Endpoints.getEndpoint( endpoint ) );
            if ( comment ) {
              query.comment = comment;
            }
            items[uri] = query;
            queryUris.push(uri);
          });
        });
        deferred.resolveWith(window, [ endpoint, store, queryUris ]);
      });
    };
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
            if ( !success ) {
              deferred.reject();
              return;
            }
            var queryUri = [endpoint];
            queryUri[1] = /\?/.test( endpoint ) ? "&" : "?";
            if ( proxy === true ) {
              queryUri = [ "sparqlproxy.php" ];
              queryUri[1] = "?";
            }
            queryUri[2] = "query=";
            queryUri[3] = encodeURIComponent( query );
            if ( proxy === true ) {
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
            if( !proxy && typeof success === "object" && success.state &&
                success.state() === "rejected" ) {
              return App.QueryList.loadQueriesFromEndpoint( endpoint, proxy );
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
        if ( queryId === undefined ) {
          return items;
        }
        var idx = queryId.lastIndexOf("_");
        var queryArray = items[queryId.substr(0, idx)];
        var index = parseInt(queryId.substr(idx+1));
        return queryArray[index];
      },
      /**
       * Creates a new variable for a query instance. If a variable with the
       * given varName already exists in the query, a fresh variable will be
       * minted. This method returns a guaranteed unique variable.
       * @param {string} queryId
       * @param {string} varName
       * @return {Query.Variable}
       */
      addVariable: function(queryId, varName) {
        var newVarName = varName;
        var i = 0;
        var query = App.QueryCanvas.getQuery(queryId);
        while ( newVarName in query.variables ) {
          newVarName = varName + (++i);
        }
        var newVarUri = URI("#"+newVarName).absoluteTo(URI(query.uri));
        var newVar = new Query.Variable(newVarUri.toString(), newVarName);
        query.variables[newVarName] = newVar;
        $(window).trigger("variable_added", [ queryId, newVar ]);
        return newVar;
      },
      /**
       * Projects a variable in the query. The variable must already exist.
       * @see #addVariable
       * @param {string} queryId
       * @param {Query.Variable} variable
       * @param {boolean} [project=true]
       */
      project: function(queryId, variable, project) {
        if ( project === undefined ) {
          project = true;
        }
        var query = App.QueryCanvas.getQuery(queryId);
        // TODO state/error checking. query.variables should contain variable
        // TODO remove variable if project === false
        query.projections.push(variable);
        $(window).trigger(project ? "projection_added" : "projection_removed",
                          [ queryId, variable ]);
      },
      /**
       * Adds a basic graph pattern to the where clause of a query.
       * @param {string} queryId
       * @param {(string|Query.Resource|Query.Variable)} subj
       * @param {(string|Query.Resource|Query.Variable)} pred
       * @param {(string|Query.Resource|Query.Variable|Query.Literal)} obj
       */
      addWhereClause: function(queryId, subj, pred, obj) {
        var query = App.QueryCanvas.getQuery(queryId);
        if ( typeof subj === "string" ) {
          subj = new Query.Resource( subj );
        }
        if ( typeof pred === "string" ) {
          pred = new Query.Resource( pred );
        }
        if ( typeof obj === "string" ) {
          obj = new Query.Resource( obj );
        }
        query.where.push(new Query.BasicGraphPattern( subj, pred, obj ));
        $(window).trigger("updated_query", [ queryId ]);
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
      instantiate: function(uri, activeEndpoint) {
        // hash to get a reasonably small identifier. collision is unlikely.
        var query = null;
        if ( uri in App.ConceptList.getConcepts() ) {
          var endpoint = activeEndpoint ||
            App.ConceptList.getConcept( uri ).endpoints[0];
          query = Query.templateForClass( endpoint, uri );
          uri = query.uri;
        } else {
          query = App.QueryList.getQuery(uri).clone();
        }
        var key = md5(uri);
        if ( items[key] === undefined ) {
          items[key] = [];
        }
        var queryId = key + "_" + items[key].length;
        query.queryId = queryId;
        items[key].push( query );
        $(window).trigger("instantiated_query", [ queryId ]);
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
        var idx = queryId.lastIndexOf('_');
        var key = queryId.substr(0, idx);
        var i = parseInt(queryId.substr(idx+1));
        items[key][i] = undefined;
        $(window).trigger("removed_query", [ queryId ]);
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
        var map = $.map(order, function(x) {
          return query.getVariable(x);
        });
        var checker = {};
        $.map(query.projections, function(v) {
          checker[v.varName] = 1;
        });
        $.map(map, function(v) {
          checker[v.varName]--;
        });
        for ( var key in checker ) {
          if ( checker[key] !== 0 ) {
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
        if ( items[newKey] === undefined ) {
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
      },
      substitute: function( queryId, oldObj, newObj ) {
        var query = App.QueryCanvas.getQuery( queryId );
        if ( typeof oldObj === "string" ) {
          oldObj = query.getVariable( oldObj );
        }
        oldObj.bind( newObj );
        $(window).trigger( "updated_query", [ queryId ]);
      }
    };
  })(),
  CommandStack: (function() {
  })(),
  init: function() {
  }
};
