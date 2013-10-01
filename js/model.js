/**
 * @overview
 * Model.js provides the query object model and the underlying application
 * model for Collustra. It triggers a number of events that can be responded
 * to in other components, such as the view system.
 * @copyright © 2013 Evan W. Patton
 * @license
 * Released under the MIT license
 * {@link https://raw.github.com/ewpatton/collustra/master/LICENSE}
 * @file
 */

/** Helper for when we want to use equals() on an object without checking the
    type for string. **/
String.prototype.equals = function(other) {
  return this === other;
};

/** Stores the SPARQL endpoint descriptions **/
var store = new rdfstore.Store({name:"rdfstore"},function(){});

/** Stores the SPARQL descriptions (using SPIN) **/
var queries = new rdfstore.Store({name:"querystore"},function(){});

var sparqlResultTypes = "application/sparql-results+json, application/sparql-results+xml";
var graphResultTypes = "text/turtle, application/ld+json, application/rdf+xml";

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
  while ( head.nominalValue !== RDF.nil ) {
    var triples = graph.match(head, rdfFirst, null).toArray();
    result.push(triples[0].object);
    triples = graph.match(head, rdfRest, null).toArray();
    head = triples[0].object;
  }
  return result;
};

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
  "Create": 9
};

function Queryable() {
}

Queryable.prototype.query = function(query, opts, deferred) {
  throw "Query method for type not implemented.";
}

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
  this.endpoints = {};
  this.activeEndpoint = null;
}

Query.prototype.getActiveEndpoint = function() {
  return this.endpoints[this.activeEndpoint];
}

Query.prototype.getEndpoints = function() {
  return this.endpoints;
}

Query.prototype.addEndpoint = function(endpoint) {
  this.endpoints[endpoint.uri] = endpoint;
  if ( this.activeEndpoint === null ) {
    this.activeEndpoint = endpoint.uri;
  }
}

/**
 * Returns a projection (if a number) or a variable (if string)
 * @param {string|number} varid String explicitly naming a variable or a
 * non-negative integer identifying a specific projection in the SPARQL
 * query.
 * @return {Query.Variable} A variable object identified by the varid
 * @throws {string} If varid does not identify a variable an exception is thrown
 */
Query.prototype.getVariable = function(varid) {
  if ( typeof varid === "string" ) {
    return this.variables[varid];
  } else if ( typeof varid === "number" ) {
    return this.projections[varid];
  } else {
    throw "Unexpected varid '"+varid+"' in Query.getVariable";
  }
};

/**
 * Serializes the prefixes used in this query.
 * @return {string} Serialization of the prefixes using the SPARQL
 * notation.
 */
Query.prototype.serializePrefixes = function() {
  var result = "";
  /*
  for( var prefix in PrefixHelper.namespaces ) {
    if ( PrefixHelper.namespaces.hasOwnProperty( prefix ) ) {
      result += "PREFIX " + prefix.toLowerCase() + ": <" +
        PrefixHelper.namespaces[prefix] + ">\n";
    }
  }
  */
  var prefixes = {};
  $.map(this.where, function(bgp) {
    var curie;
    if(bgp instanceof Query.ServiceBlock) {
      result += Query.prototype.serializePrefixes.call( bgp );
      return;
    }
    if(bgp.subject instanceof Query.Resource) {
      curie = PrefixHelper.curieObject(bgp.subject.uri);
      if( curie.prefix !== null && !(curie.prefix in prefixes) ) {
        prefixes[curie.prefix] = curie.prefixUri;
      }
    }
    if(bgp.predicate instanceof Query.Resource) {
      curie = PrefixHelper.curieObject(bgp.predicate.uri);
      if( curie.prefix !== null && !(curie.prefix in prefixes) ) {
        prefixes[curie.prefix] = curie.prefixUri;
      }
    }
    if(bgp.object instanceof Query.Resource) {
      curie = PrefixHelper.curieObject(bgp.object.uri);
      if( curie.prefix !== null && !(curie.prefix in prefixes) ) {
        prefixes[curie.prefix] = curie.prefixUri;
      }
    }
  });
  for(var prefix in prefixes) {
    if(prefixes.hasOwnProperty(prefix)) {
      result += "PREFIX " + prefix + ": <" + prefixes[prefix] + ">\n";
    }
  }
  return result;
};

/**
 * Serializes the projections used in this query.
 * @return {string} Serialization of the projections using SPARQL
 * 1.1 notation.
 */
Query.prototype.serializeProjections = function() {
  if ( this.projections.length === 0 ) {
    return " *";
  } else {
    var result = "";
    for ( var i = 0; i < this.projections.length; i++ ) {
      result += " ";
      result += this.projections[i].toString( undefined, "projection" );
    }
    return result;
  }
};

/**
 * Serializes the where clause of the query.
 * @return {string} Serialization of the where clause in the query,
 * compacted using the semicolon and comma operators where possible
 * based on the Turtle/SPARQL grammar.
 * @see {BasicGraphPattern#toString}
 * @param {boolean} [wrap=true] Wrap the where block with WHERE { ... }
 * @return {string} A where clause in the SPARQL serialization
 */
Query.prototype.serializeWhereClause = function(wrap) {
  wrap = wrap === undefined ? true : wrap;
  var result = "";
  if ( wrap === true ) {
    result = " WHERE {\n";
  }
  for ( var i = 0; i < this.where.length; i++ ) {
    result += this.where[i].toString( i ? this.where[i-1] : null );
  }
  if ( wrap === true ) {
    return result + "\n}";
  } else {
    return result;
  }
};

/**
 * Converts the Query into a string containing a SPARQL serialization.
 * @param {Object} [opts] Additional arguments that
 * will override the set OFFSET/LIMIT values in the query object.
 * @param {number} [opts.offset] Override internal offset for OFFSET
 * clause with the specified value
 * @param {number} [opts.limit] Override internal limit for LIMIT
 * clause with the specified value
 * @return {string} SPARQL string serializing this query.
 */
Query.prototype.toString = function(opts) {
  var result = "";
  if ( this.type === QueryType.Select ) {
    result += this.serializePrefixes();
    result += "SELECT";
    result += this.serializeProjections();
    result += this.serializeWhereClause();
    if ( this.order.length > 0 ) {
      result += " ORDER BY";
    }
    for ( var i = 0; i < this.order.length; i++ ) {
      result += " " + this.order[i].toString();
    }
    if ( opts && opts["offset"] ) {
      result += " OFFSET " + opts.offset;
    }
    if ( opts && opts["limit"] ) {
      result += " LIMIT " + opts.limit;
    }
  }
  return result;
};

/**
 * Applies this query as a substitution into the given query template.
 * @param {string} template Query template to apply
 * @param {Object} substitutions Additional substitutions for the template.
 * @return {string} A query string serializing the template applied with the
 * contents of this query.
 */
Query.prototype.applyToTemplate = function(template, substitutions) {
  if ( template.indexOf("#@QUERY_PREFIXES@#") !== -1 ) {
    template = template.replace(/#@QUERY_PREFIXES@#/gi,
                                this.serializePrefixes());
  }
  if ( template.indexOf("#@QUERY_WHERE@#") !== -1 ) {
    template = template.replace(/#@QUERY_WHERE@#/gi,
                                this.serializeWhereClause(false)+" .");
  }
  for ( var name in substitutions ) {
    if ( substitutions.hasOwnProperty(name) &&
         template.indexOf( "#@" + name + "@#" ) !== -1 ) {
      console.log("substituting '#@" + name + "@#' with " +
                  substitutions[name].toString());
      template = template.replace( new RegExp("#@" + name + "@#", "gi"),
                                   substitutions[name].toString() );
    }
  }
  return template;
};

(function() {
/**
 * Checks whether the given node is a variable. If so, it returns the value of
 * the sp:varName property.
 * @param store Rdfstore used for creating named nodes
 * @param graph Graph containing the node description
 * @param node Node to test
 * @returns null if the node is not an sp:Variable, otherwise the string value
 * of sp:varName.
 */
var isVariable = function(store, graph, node) {
  var varName = store.rdf.createNamedNode(SP.varName);
  var names = graph.match(node, varName).toArray();
  if ( names && names.length > 0 ) {
    return names[0].object.nominalValue;
  }
  return null;
};

/**
 * Converts an expression in SPIN RDF notation into an internal structure
 * that can be manipulated in JavaScript.
 * @param {rdfstore.Store} store An RDF Store used for creating named nodes.
 * @param {rdfstore.Graph} graph An RDF Graph containing the SPIN description.
 * @param {Query} query The Query object being created
 * @param {rdfstore.Store.RDFNode} node A blank node representing the expression
 * to be transformed.
 * @return {Query.Expression|Query.Variable} An expression (if node is an
 * arbitrary expression) or a variable if the node names a variable.
 * @todo support entire SPARQL expressions here...
 */
var expressionToObject = function(store, graph, query, node) {
  var varName = isVariable( store, graph, node );
  if ( !varName ) {
    throw "Only variables are supported at this time.";
  }
  return query.variables[varName];
};

/**
 * Processes SPIN description of projections into a Query object that can be
 * manipulated easily in JavaScript.
 * @param {rdfstore.Store} store An RDF Store used for creating named nodes.
 * @param {rdfstore.Graph} graph An RDF Graph containing the SPIN description.
 * @param {Query} query The Query object being created
 * @param {rdfstore.Store.RDFNode} qnode The node representing the query in the
 * SPIN graph.
 * @todo support expressions beyond variables...
 */
var processProjections = function(store, graph, query, qnode) {
  var vars = graph.match(qnode, store.rdf.createNamedNode(SP.resultVariables))
    .toArray();
  if ( vars.length > 0 ) {
    vars = rdfListToArray(store, graph, vars[0].object);
    var varName = store.rdf.createNamedNode(SP.varName);
    for(var i=0; i<vars.length; i++) {
      var name = graph.match(vars[i], varName).toArray();
      var projection = new Query.Variable(vars[i].nominalValue,
                                          name[0].object.nominalValue);
      var rdfsLabel = queries.rdf.createNamedNode(RDFS.label);
      var rdfsComment = queries.rdf.createNamedNode(RDFS.comment);
      var label = graph.match(vars[i], rdfsLabel).toArray();
      if ( label.length > 0 ) {
        projection.label = label[0].object.nominalValue;
      }
      var comment = graph.match(vars[i], rdfsComment).toArray();
      if ( comment.length > 0 ) {
        projection.comment = comment[0].object.nominalValue;
      }
      query.variables[projection.varName] = projection;
      query.projections.push(projection);
    }
  }
};

/**
 * Processes SPIN description of a triple and converts it into a basic graph
 * pattern object.
 * @param {rdfstore.Store} store An RDF Store used for creating named nodes.
 * @param {rdfstore.Graph} graph An RDF Graph containing the SPIN description.
 * @param {Query} query The Query object being created
 * @param {rdfstore.Store.RDFNode} triple The node representing a triple
 * @return {Query.BasicGraphPattern} A basic graph pattern object that can be
 * used in the where clause or as part of an expression, e.g. in a NOT EXISTS
 * filter.
 * @todo support expressions beyond variables...
 */
var processBasicGraphPattern = function(store, graph, query, triple) {
  var subj = store.rdf.createNamedNode(SP.subject);
  var pred = store.rdf.createNamedNode(SP.predicate);
  var obj = store.rdf.createNamedNode(SP.object);
  var s = graph.match(triple, subj).toArray();
  var svar = isVariable(store, graph, s[0].object);
  var p = graph.match(triple, pred).toArray();
  var pvar = isVariable(store, graph, p[0].object);
  var o = graph.match(triple, obj).toArray();
  var ovar = isVariable(store, graph, o[0].object);
  if ( svar ) {
    svar = new Query.Variable(s[0].object.nominalValue, svar);
    if ( query.variables[svar.varName] === undefined ) {
      query.variables[svar.varName] = svar;
    } else {
      svar = query.variables[svar.varName];
    }
  } else {
    svar = new Query.Resource(s[0].object.nominalValue,
                              s[0].object.interfaceName === "BlankNode");
  }
  if ( pvar ) {
    pvar = new Query.Variable(p[0].object.nominalValue, pvar);
    if ( query.variables[pvar.varName] === undefined ) {
      query.variables[pvar.varName] = pvar;
    } else {
      pvar = query.variables[pvar.varName];
    }
  } else {
    pvar = new Query.Resource(p[0].object.nominalValue,
                              p[0].object.interfaceName === "BlankNode");
  }
  if ( ovar ) {
    ovar = new Query.Variable(o[0].object.nominalValue, ovar);
    if ( query.variables[ovar.varName] === undefined ) {
      query.variables[ovar.varName] = ovar;
    } else {
      ovar = query.variables[ovar.varName];
    }
  } else {
    if ( o[0].object.interfaceName === "Literal" ) {
      var type = null;
      if ( o[0].object.language ) {
        type = { "lang": o[0].object.language };
      } else if ( o[0].object.datatype ) {
        type = { "datatype": o[0].object.datatype };
      }
      ovar = new Query.Literal(o[0].object.nominalValue, type);
    } else {
      ovar = new Query.Resource(o[0].object.nominalValue,
                                o[0].object.interfaceName === "BlankNode");
    }
  }
  return new Query.BasicGraphPattern(svar, pvar, ovar);

};

/**
 * Processes the where clause of a SPIN query into an internal JavaScript
 * representation that is easy to manipulate.
 * @param {rdfstore.Store} store An RDF Store used for creating named nodes.
 * @param {rdfstore.Graph} graph An RDF Graph containing the SPIN description.
 * @param {Query} query The Query object being created
 * @param {rdfstore.Store.RDFNode} qnode The node representing the query in the
 * SPIN graph.
 * @todo support expressions beyond variables...
 */
var processWhereClause = function(store, graph, query, qnode) {
  var where = graph.match(qnode, store.rdf.createNamedNode(SP.where)).toArray();
  where = rdfListToArray(store, graph, where[0].object);
  var subj = store.rdf.createNamedNode(SP.subject);
  for(var i=0; i<where.length;i ++) {
    // TODO this block assumes that everything in the where clause is a triple
    // pattern, which is not necessarily true (e.g. OPTIONAL, FILTER, etc.)
    var triple = where[i];
    var s = graph.match(triple, subj).toArray();
    if ( s.length === 0 ) {
      continue;
    } else {
      var bgp = processBasicGraphPattern(store, graph, query, triple);
      query.where.push(bgp);
    }
  }
};

/**
 * Processes a SELECT query from a SPIN description in RDF.
 * @memberof Query
 * @private
 * @param {rdfstore.Store} store
 * @param {rdfstore.Graph} graph
 * @param {Query} query
 * @todo not yet complete
 */
var processSelectQuery = function(store, graph, query) {
  var qnode = store.rdf.createNamedNode(query.uri);
  processProjections(store, graph, query, qnode);
  processWhereClause(store, graph, query, qnode);
  var ordering = graph.match(qnode, store.rdf.createNamedNode(SP.orderBy))
    .toArray();
  if ( ordering.length > 0 ) {
    ordering = rdfListToArray(store, graph, ordering[0].object);
    var rdfType = store.rdf.createNamedNode(RDF.type);
    var spExpression = store.rdf.createNamedNode(SP.expression);
    $.map(ordering, function(order) {
      var triples = graph.match(order, rdfType).toArray();
      if ( triples.length > 0 ) {
        var extriple = graph.match(order, spExpression).toArray();
        var ex = expressionToObject( store, graph, query, extriple[0].object );
        if ( triples[0].object.nominalValue === SP.Asc ) {
          query.order.push( new Query.OrderBy( Query.Order.ASC, ex ) );
        } else if ( triples[0].object.nominalValue === SP.Desc ) {
          query.order.push( new Query.OrderBy( Query.Order.DESC, ex ) );
        } else {
          console.warn("Unexpected type while ordering: " +
                       triples[0].object.nominalValue);
        }
      }
    });
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
  var query = null;
  for(var i=0; i<types.length; i++) {
    var t = types[i].object;
    if(t.nominalValue.indexOf(SP.NS) === 0 &&
       t.nominalValue !== SP.Query) {
      switch(t.nominalValue) {
      case SP.Select:
        query = new Query(uri, QueryType.Select);
        processSelectQuery(store, graph, query);
        break;
      default:
        throw "Only accepts Select queries.";
      }
      break;
    }
  }
  if(query === null) {
    throw "No query type found. Aborting.";
  }
  return query;
};

/**
 * Creates a basic Query that queries for instances of the given class URI.
 * @param {string|Endpoint} endpoint A URI or Endpoint object identifying an
 * endpoint.
 * @param {string} uri The URI of a class named in the endpoint.
 * @return {Query} A query that can be used to list instances in the endpoint
 * that are members of the named class.
 */
Query.templateForClass = function(endpoint, uri) {
  var concept = App.ConceptList.getConcept( uri );
  if ( typeof endpoint === "string" ) {
    endpoint = App.Endpoints.getEndpoint(endpoint);
  }
  var queryUri = URI("query"+md5(uri)+".spin#").absoluteTo(URI(endpoint.uri));
  var query = new Query(queryUri.toString()+"#", QueryType.Select);
  var id = new Query.Variable(queryUri+"#id", "id");
  var rdfType = new Query.Resource(RDF.type);
  var clsResource = new Query.Resource(uri);
  query.label = concept.label;
  query.addEndpoint(endpoint);
  query.projections.push(id);
  query.variables[id.varName] = id;
  query.where.push(new Query.BasicGraphPattern(id, rdfType, clsResource));
  return query;
};

})();

/**
 * @class Variable
 * @memberof Query
 * @classdesc
 * Constructs a new SPARQL variable identified by the given URI and with the
 * name varName
 * @param {string} uri A URI used to identify this variable when serialized in
 * an RDF graph.
 * @param {varName} varName The variable name, which must be compliant with the
 * naming rules for SPARQL variables.
 */
Query.Variable = function(uri, varName) {
  this.uri = uri;
  this.varName = varName;
  this.boundValue = null;
};

Query.Variable.prototype.bind = function( value ) {
  this.boundValue = value;
};

Query.Variable.prototype.unbind = function() {
  this.boundValue = null;
};

/**
 * Prints the variable using the SPARQL variable production
 * @example
 * (new Query.Variable("uri")).toString()
 *  => "?uri"
 * @return {string} Variable string
 */
Query.Variable.prototype.toString = function(namespaces, context) {
  if ( this.boundValue !== null ) {
    if ( context === "projection" ) {
      return "(" + this.boundValue.toString() + " AS ?" + this.varName + ")";
    }
    return this.boundValue.toString();
  }
  return "?" + this.varName;
};

/**
 * Clones the variable.
 * @return {Query.Variable} A new Query.Variable that is equal to, but not the
 * same as, the original instance.
 */
Query.Variable.prototype.clone = function() {
  var copy = new Query.Variable(this.uri, this.varName);
  copy.boundValue = this.boundValue;
  return copy;
};

/**
 * Checks whether the given object is equal to this variable.
 * @param {object} other An object to check for equality
 * @return {boolean}
 */
Query.Variable.prototype.equals = function(other) {
  if ( other === null ) {
    return false;
  } else if ( !( other instanceof Query.Variable ) ) {
    return false;
  } else if (other === this) {
    return true;
  }
  return this.uri === other.uri && this.varName === other.varName;
};

/**
 * @class
 * @classdesc
 * An enumerated class that is used to identify the ordering of a SPARQL ORDER
 * BY clause.
 * @memberof Query
 */
Query.Order = {"ASC": 1, "DESC": 0};

/**
 * @class OrderBy
 * @classdesc
 * Constructs a new SPARQL ordering using the given direction and an expression.
 * @param {Query.Order} dir Direction of the ordering
 * @param {Query.Expression|Query.Variable} ex An expression to order by.
 * @memberof Query
 */
Query.OrderBy = function(dir, ex) {
  this.direction = dir;
  this.expression = ex;
};

Query.OrderBy.prototype.toString = function() {
  var result = null;
  if ( this.direction === Query.Order.ASC ) {
    result = "ASC(";
  } else {
    result = "DESC(";
  }
  result += this.expression.toString();
  result += ")";
  return result;
};

Query.OrderBy.prototype.clone = function() {
  var copy = new Query.OrderBy(this.direction, this.expression);
  return copy;
};

Query.JoinedQueryType = {
  "Substitution": 0,
  "Subquery": 1,
  "Service": 2
};

Query.JoinedVariable = function(query1, query2, type) {
  this.uri = query1.variable.uri;
  this.varName = query1.variable.varName;
  this.boundValue = query1.variable.boundValue || query2.variable.boundValue;
  this.orgQuery = query1;
  this.joinedTo = query2;
  this.joinType = type || Query.JoinedQueryType.Substitution;
};

Query.JoinedVariable.prototype = Object.create(Query.Variable.prototype);

/*
Query.JoinedVariable.prototype.toString = function() {
  return "?"+this.varName;
};
*/

/**
 * @class Resource
 * @memberof Query
 * @classdesc
 * Resource
 * @constructor
 * @param {string} uri URI represented by the resource, e.g.
 * http://www.w3.org/1999/02/22-rdf-syntax-ns#type
 * @param {boolean} isBnode true if the resource is meant to represent a blank
 * node
 */
Query.Resource = function(uri, isBnode) {
  this.uri = uri;
  this.bnode = isBnode;
};

Query.Resource.prototype.toString = function(namespaces) {
  var curie = PrefixHelper.compact(this.uri, namespaces);
  return curie || "<" + this.uri + ">";
};

Query.Resource.prototype.clone = function() {
  var copy = new Query.Resource(this.uri, this.bnode);
  return copy;
};

Query.Resource.prototype.equals = function(other) {
  if ( other === null ) {
    return false;
  } else if ( !( other instanceof Query.Resource ) ) {
    return false;
  } else if ( this === other ) {
    return true;
  }
  return this.uri === other.uri && this.bnode === other.bnode;
};

Query.Literal = function(value, datatype, lang) {
  this.value = value;
  this.datatype = datatype;
  this.lang = lang;
};

Query.Literal.prototype.toString = function(namespaces) {
  var wrap = '"';
  if ( /[\r|\n]/.test( this.value ) ) {
    wrap = '"""';
  }
  if ( this.datatype !== undefined ) {
    var dtcurie = PrefixHelper.compact( this.datatype, namespaces );
    if ( dtcurie !== null ) {
      return wrap + this.value + wrap + "^^" + dtcurie;
    } else {
      return wrap + this.value + wrap + "^^<" + this.datatype + ">";
    }
  } else if ( this.lang !== undefined ) {
    return wrap + this.value + wrap + "@" + this.lang;
  } else {
    return wrap + this.value + wrap;
  }
};

Query.Literal.prototype.clone = function() {
  var copy = new Query.Literal( this.value, this.datatype, this.lang );
  return copy;
};

Query.Literal.prototype.equals = function(other) {
  if ( other === null ) {
    return false;
  } else if ( !( other instanceof Query.Literal ) ) {
    return false;
  } else if ( this === other ) {
    return true;
  }
  return this.value === other.value && this.datatype === other.datatype &&
    this.lang === other.lang;
};

Query.GraphComponent = function() {
};

Query.BasicGraphPattern = function(subj, pred, obj) {
  Query.GraphComponent.call(this);
  this.subject = subj;
  this.predicate = pred;
  this.object = obj;
};

Query.BasicGraphPattern.prototype.toString = function(previous) {
  if(previous instanceof Query.BasicGraphPattern) {
    if(previous.subject.equals( this.subject )) {
      if(previous.predicate.equals( this.predicate )) {
        return ", " + this.object.toString() + " ";
      } else {
        return ";\n  " + (this.predicate.uri === RDF.type ? " a " :
                           this.predicate.toString()) +
          " " + this.object.toString() + " ";
      }
    } else {
      return ".\n" + this.subject.toString() + " " +
        (this.predicate.uri === RDF.type ? " a " : this.predicate.toString()) +
        " " + this.object.toString() + " ";
    }
  } else {
    if(this.predicate.uri === RDF.type) {
      return this.subject.toString() + " a " + this.object.toString() + " ";
    } else {
      return this.subject.toString() + " " +
        this.predicate.toString() + " " +
        this.object.toString() + " ";
    }
  }
};

Query.BasicGraphPattern.prototype.clone = function() {
  var copy = new Query.BasicGraphPattern();
  copy.subject = this.subject;
  copy.predicate = this.predicate;
  copy.object = this.object;
  return copy;
};

var cloneArray = function(arr) {
  return $.map(arr, function(el) {
    if( el.clone ) {
      return el.clone();
    } else if ( el instanceof Array ) {
      return cloneArray( el );
    } else if ( el instanceof Object ) {
      return $.extend(true, {}, el);
    } else {
      return el;
    }
  });
};

var cloneDict = function(obj) {
  var copy = {};
  for(var key in obj) {
    if(obj.hasOwnProperty(key)) {
      var el = obj[key];
      if( el.clone ) {
        copy[key] = el.clone();
      } else if ( el instanceof Array ) {
        copy[key] = cloneArray( el );
      } else if ( el instanceof Object ) {
        copy[key] = $.extend(true, {}, el);
      } else {
        return el;
      }
    }
  }
  return copy;
};

Query.prototype.clone = function() {
  var copy = new Query();
  copy.uri = this.uri;
  copy.type = this.type;
  copy.projections = cloneArray(this.projections);
  copy.where = cloneArray(this.where);
  copy.order = cloneArray(this.order);
  copy.product = cloneArray(this.product);
  copy.deletes = cloneArray(this.deletes);
  copy.target = this.target;
  copy.variables = cloneDict(this.variables);
  if ( this.label ) {
    copy.label = this.label;
  }
  copy.endpoints = cloneDict( this.endpoints );
  copy.activeEndpoint = this.activeEndpoint;
  if ( this.prefixes ) {
    copy.prefixes = cloneDict( this.prefixes );
  } else {
    copy.prefixes = {};
  }
  return copy;
};

Query.ServiceBlock = function( query, map ) {
  var copy, i;
  this.endpoints = query.endpoints;
  this.activeEndpoint = query.activeEndpoint;
  this.where = [];
  this.variables = {};
  for ( i = 0; i < query.where.length; i++ ) {
    copy = query.where[i].clone();
    if ( map !== undefined ) {
      copy.subject = map[copy.subject.varName] || copy.subject;
      copy.predicate = map[copy.predicate.varName] || copy.predicate;
      copy.object = map[copy.object.varName] || copy.object;
    }
    if ( copy.subject.varName !== undefined &&
         this.variables[copy.subject.varName] === undefined ) {
      this.variables[copy.subject.varName] = copy.subject;
    } else if ( copy.subject instanceof Query.Variable ) {
      copy.subject = this.variables[copy.subject.varName];
    }
    if ( copy.predicate.varName !== undefined &&
         this.variables[copy.predicate.varName] === undefined ) {
      this.variables[copy.predicate.varName] = copy.predicate;
    } else if ( copy.predicate instanceof Query.Variable ) {
      copy.predicate = this.variables[copy.predicate.varName];
    }
    if ( copy.object.varName !== undefined &&
         this.variables[copy.object.varName] === undefined ) {
      this.variables[copy.object.varName] = copy.object;
    } else if ( copy.object instanceof Query.Variable ) {
      copy.object = this.variables[copy.object.varName];
    }
    this.where.push( copy );
  }
};

Query.ServiceBlock.prototype.toString = function( namespaces ) {
  var result = "\nSERVICE <" + this.activeEndpoint + "> {\n";
  for ( var i = 0; i < this.where.length; i++ ) {
    result += this.where[i].toString( i > 0 ? this.where[i-1] : undefined );
  }
  return result + "\n}\n";
};

Query.JoinedQuery = function(query1, query2, type) {
  type = type || Query.JoinedQueryType.Substitution;
  if ( query1.query.activeEndpoint != query2.query.activeEndpoint ) {
    // different endpoints, force SERVICE keyword
    type = Query.JoinedQueryType.Service;
  }
  var copy;
  // this won't be a valid URI, but it is internal for now.
  this.uri = query1.query.uri + query2.query.type;
  this.type = query1.query.type;
  this.projections = [];
  this.joinType = type;
  var map = {};
  var map2 = {};
  var mapByUri = {};
  this.joinVariable = new Query.JoinedVariable(query1, query2, type);
  map[query1.variable.varName] = this.joinVariable;
  map2[query2.variable.varName] = this.joinVariable;
  mapByUri[query1.variable.uri] = this.joinVariable;
  mapByUri[query2.variable.uri] = this.joinVariable;
  var i;
  for ( i = 0; i < query1.query.projections.length; i++ ) {
    if ( query1.variable.equals( query1.query.projections[i] ) ) {
      this.projections.push( this.joinVariable );
    } else {
      copy = query1.query.projections[i].clone();
      map[copy.varName] = copy;
      mapByUri[copy.uri] = copy;
      this.projections.push( copy );
    }
  }
  for ( i = 0; i < query2.query.projections.length; i++ ) {
    if ( query2.variable.equals( query2.query.projections[i] ) ) {
      // joining here, but it is already in this.projections so just continue
      continue;
    } else {
      copy = query2.query.projections[i].clone();
      if ( copy.uri in mapByUri ) {
        copy = mapByUri[copy.uri];
      } else {
        while ( map[copy.varName] !== undefined ||
                map2[copy.varName] !== undefined ) {
          var idx = copy.varName.search(/[0-9]+$/);
          if ( idx >= 0 ) {
            var count = parseInt( copy.varName.substr( idx ) );
            copy.varName = copy.varName.substr( 0, idx ) +
              ( count + 1 );
          } else {
            copy.varName += "1";
          }
        }
        this.projections.push( copy );
      }
      map2[query2.query.projections[i].varName] = copy;
    }
  }
  this.where = [];
  this.order = [];
  for ( i = 0; i < query1.query.where.length; i++ ) {
    copy = query1.query.where[i].clone();
    copy.subject = map[copy.subject.varName] || copy.subject;
    copy.predicate = map[copy.predicate.varName] || copy.predicate;
    copy.object = map[copy.object.varName] || copy.object;
    this.where.push( copy );
  }
  for ( i = 0; i < query1.query.order.length; i++ ) {
    copy = query1.query.order[i].clone();
    if ( copy.expression instanceof Query.Variable ) {
      copy.expression = map[copy.expression.varName];
    }
    if ( copy["expression"] === undefined ) {
      throw "Expected an order expression to be a projected variable";
    }
    this.order.push( copy );
  }
  if ( type === Query.JoinedQueryType.Substitution ) {
    // TODO this mechanism does not yet rename non-projected variables
    for ( i = 0; i < query2.query.where.length; i++ ) {
      copy = query2.query.where[i].clone();
      copy.subject = map2[copy.subject.varName] || copy.subject;
      copy.predicate = map2[copy.predicate.varName] || copy.predicate;
      copy.object = map2[copy.object.varName] || copy.object;
      this.where.push( copy );
    }
  } else if ( type === Query.JoinedQueryType.Service ) {
    this.where.push( new Query.ServiceBlock( query2.query, map2 ) );
  }
  for ( i = 0; i < query2.query.order.length; i++ ) {
    copy = query2.query.order[i].clone();
    if ( copy.expression instanceof Query.Variable ) {
      copy.expression = map2[copy.expression.varName];
    }
    if ( copy["expression"] === undefined ) {
      throw "Expected an order expression to be a projected variable";
    }
    this.order.push( copy );
  }
  this.product = [];
  this.deletes = [];
  this.target = query1.query.target;
  //this.variables = $.extend({}, map, map2);
  this.variables = {};
  var mapper = (function(obj) {
    return function(key, value) {
      if ( obj[ value.varName ] === undefined ) {
        obj[ value.varName ] = value;
      }
    };
  })(this.variables);
  $.each(map, mapper);
  $.each(map2, mapper);
  this.label = query1.query.label + " joined with " + query2.query.label;
  this.comment = query1.query.comment;
  this.endpoints = {};
  this.activeEndpoint = null;
  // Will not work when joining a query with joined query, you'll get
  // something like [ endpoint3, [ endpoint1, endpoint2 ] ]
  // update to use splice to append multiple arrays together.
  var e1 = query1.query.getActiveEndpoint();
  var e2 = query2.query.getActiveEndpoint();
  if ( e1.equals(e2) ) {
    this.endpoints[e1.uri] = e1;
  } else {
    this.endpoints[e1.uri] = e1;
    this.endpoints[e2.uri] = e2;
  }
  this.activeEndpoint = e1.uri;
};

Query.JoinedQuery.prototype = new Query();

/**
 * @class
 * @classdesc
 * @constructor
 * @param {string} uri URI of the SPARQL endpoint
 */
function Endpoint(uri) {
  this.uri = uri;
  this.label = "";
  this.comment = "";
  this.proxy = false;
};

Endpoint.prototype = Object.create(Queryable.prototype);

Endpoint.prototype.toString = function() {
  return this.uri;
};

/**
 * Compares two endpoints for equality.
 * @param {*} other An object to test for equality.
 * @return {boolean} true if the two endpoints are equal, otherwise
 * false. If other is not an instance of Endpoint, this will return
 * false.
 */
Endpoint.prototype.equals = function(other) {
  if ( this === other ) {
    return true;
  } else if ( other === null ) {
    return false;
  } else if ( typeof this === typeof other ) {
    return false;
  }
  if ( this.uri === other.uri ) {
    return true;
  }
};

Endpoint.prototype.query = function(query, opts, deferred) {
  deferred = deferred || $.Deferred();
  var url = this.proxy ? "sparqlproxy.php" : this.uri;
  var data = {};
  if ( this.proxy ) {
    data["output"] = "sparqljson";
    data["query-option"] = "text";
    data["service-uri"] = this.uri;
  } else {
    data["timeout"] = 5000;
  }
  var headers = {};
  if ( typeof query === "string" ) {
    data["query"] = query;
    if ( /ask/i.test(query) || /select/i.test(query) ) {
      headers = {"Accept": sparqlResultTypes};
    } else if ( /construct/i.test(query) || /describe/i.test(query ) ) {
      headers = {"Accept": graphResultTypes};
    }
  } else {
    data["query"] = query.toString( opts );
    switch ( query.type ) {
    case QueryType.Select:
    case QueryType.Ask:
      headers = {"Accept": sparqlResultTypes};
      break;
    case QueryType.Construct:
    case QueryType.Describe:
      headers = {"Accept": graphResultTypes};
      break;
    default:
      break;
    }
  }
  var self = this;
  var doProxy = self.proxy;
  $.ajax(url, {"data": data, "headers": headers})
    .then(function(data, status, jqxhr) {
      if ( stripMimeParameters( jqxhr.getResponseHeader( "Content-Type" ) )
           == "application/sparql-results+xml" ) {
        var results = {"head": {}, "results": {"bindings": []}};
        var head = data.getElementsByTagName("head")[0];
        var variables = head.getElementsByTagName("variable");
        if ( variables.length > 0 ) {
          results.head["vars"] = [];
          $.map( variables, function( el ) {
            results.head.vars.push( el.getAttribute( "name" ) );
          });
        }
        var links = head.getElementsByTagName("link");
        if ( links.length > 0 ) {
          results.head["links"] = [];
          $.map( links, function( el ) {
            results.head.links.push( el.getAttribute( "href" ) );
          });
        }
        var bindings = data.getElementsByTagName("result");
        $.map( bindings, function( el ) {
          var binding = {};
          var b = el.getElementsByTagName( "binding" );
          $.map( b, function( el ) {
            var key = el.getAttribute( "name" );
            var n = el.firstChild;
            var type = n.tagName.toLowerCase();
            var value = n.firstChild.textContent;
            if ( type === "uri" ) {
              binding[key] = {"type": "uri", "value": value};
            } else if ( type === "bnode" ) {
              binding[key] = {"type": "bnode", "value": value};
            } else if ( type === "literal" ) {
              if ( b.firstChild.getAttribute( "datatype" ) !== null ) {
                var dt = b.firstChild.getAttribute( "datatype" );
                binding[key] = {"type": "literal", "datatype": dt,
                                "value": value};
                return;
              }
              if ( b.firstChild.getAttribute( "xml:lang" ) !== null ) {
                var lang = b.firstChild.getAttribute( "xml:lang" );
                binding[key] = {"type": "literal", "xml:lang": lang,
                                "value": value};
                return;
              }
              binding[key] = {"type": "literal", "value": value};
            } else {
              console.warn( "Unknown element type: " + type );
            }
          });
          results.results.bindings.push( binding );
        });
        deferred.resolveWith( this, [ results, status, jqxhr ] );
      } else {
        deferred.resolveWith( this, [ data, status, jqxhr ] );
      }
      return deferred.promise();
    }, function(jqxhr, status, error) {
      if ( jqxhr.state() === "rejected" && jqxhr.status === 0 &&
           !doProxy ) {
        self.proxy = true;
        self.query(query, opts, deferred);
      } else if ( jqxhr.status === 200 &&
                  stripMimeParameters(jqxhr.getResponseHeader("Content-Type"))
                  === "text/javascript" ) {
        try {
          var data = JSON.parse(jqxhr.responseText);
          deferred.resolveWith( this, [ data, jqxhr.status, jqxhr ] );
        } catch( e ) {
          deferred.rejectWith(this, [ jqxhr, status, error ]);
        }
        return deferred.promise();
      } else {
        deferred.rejectWith(this, [ jqxhr, status, error ]);
        return deferred.promise();
      }
    });
  return deferred.promise();
};

(function() {

var processResults = function(graph, deferred) {
  deferred = deferred || $.Deferred();
  var rdf = store.rdf;
  var arr = graph.match(null, rdf.createNamedNode(SD.endpoint),
                        rdf.createNamedNode(this.uri)).toArray();
  var subj = this.uri;
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
  if ( label !== null && label !== "" ) {
    this.label = label;
    this.comment = comment;
    App.Endpoints.addEndpoint(this, deferred);
  } else {
    // could not read endpoint and haven't tried to proxy
    deferred.reject();
  }
  return deferred.promise();
};

Endpoint.prototype.readDescription = function(deferred) {
  var self=this;
  deferred = deferred || jQuery.Deferred();
  var args = {
    "query":"prefix sd: <http://www.w3.org/ns/sparql-service-description#> " +
      "describe <" + this.uri + "> ?endpoint where { optional { "+
      "?endpoint sd:endpoint <"+this.uri+"> }}"
  };
  if ( this.proxy ) {
    args["service-uri"] = this.uri;
    args["query-option"] = "text";
    args["output"] = "rdfn3";
  }
  $.ajax(this.proxy ? "sparqlproxy.php" : this.uri,
         {"data": args, "headers": {"Accept": graphResultTypes}})
    .fail(function(jqxhr) {
      if ( jqxhr.state() === "rejected" && jqxhr.status === 0 ) {
        // CORS rejection, attempt to proxy
        self.proxy = true;
        self.readDescription(deferred);
      } else {
        deferred.reject();
      }
    })
    .done(function(data, code, jqxhr) {
      store.load(stripMimeParameters(jqxhr.getResponseHeader("Content-Type")),
                 data, self.uri, function(success) {
                   if(!success) {
                     throw "Unable to parse turtle model.";
                   }
                   store.graph(self.uri, function(found, graph) {
                     if(!found) {
                       throw "Unable to find endpoint graph in model.";
                     }
                     console.debug("Loaded endpoint description into graph " +
                                   self.uri);
                     window.graph = graph;
                     processResults.call(self, graph, deferred);
                   });
                 });
    });
  return deferred.promise();
};
})();

function stripMimeParameters(mime) {
  var idx = mime.indexOf(';');
  if ( idx >= 0 ) {
    return mime.substr( 0, idx );
  } else {
    return mime;
  }
}

/**
 * Expands a string in camel case into a string with spaces
 * by capitalizing the first character and placing a space before
 * any uppercase character so long as it is preceeded by a non-uppercase
 * character.
 * @param {string} text String to convert
 * @return {string} String with spaces inserted before capitalized letters
 */
function expandCamelCase(text) {
  var arr = [];
  for(var i=0 ;i<text.length; i++) {
    if ( i === 0 && text[i] >= 'a' && text[i] <= 'z' ) {
      arr[i] = (text[i]).toUpperCase();
    } else if ( i > 0 && text[i] >= 'A' && text[i] <= 'Z' ) {
      if( text[i-1] >= 'A' && text[i-1] <= 'Z' ) {
        arr[i] = text[i];
      } else {
        arr[i] = " " + text[i];
      }
    } else if ( text[i] == '_' ) {
      arr[i] = ' ';
    } else {
      arr[i] = text[i];
    }
  }
  return arr.join('');
}

/**
 * Uses the URI fragment or final element in the URI's path to generate a label
 * for the URI in the event that a label is unavailable in the knowledge store.
 * @example
 * labelFromUri("http://www.w3.org/2002/07/owl#ObjectProperty")
 *  => "Object Property"
 * labelFromUri("http://xmlns.com/foaf/0.1/givenName")
 *  => "Given Name"
 * @param {string|Uri} uri A string or Uri object representing a URI
 * @return {string} A string converted from camel case originating from the
 * fragment (#) or final path part (/).
 * @seealso #expandCamelCase
 */
function labelFromUri(uri) {
  if ( typeof uri === "string" ) {
    uri = new URI( uri );
  }
  if ( uri.fragment() === "" ) {
    return expandCamelCase(uri.filename());
  } else {
    return expandCamelCase(uri.fragment());
  }
}

/**
 * @class Concept
 * @classdesc
 * Models a concept (class) in the semantic web
 * @param {string} uri URI of the concept
 */
function Concept(uri) {
  this.uri = uri;
  this.label = undefined;
  this.comment = undefined;
  this.endpoints = [];
}

function Document(uri) {
  this.uri = uri;
  this.label = undefined;
  this.comment = undefined;
  this.store = undefined;
  this.graph = undefined;
  this.load = $.Deferred();
  this.store = new rdfstore.create();
  var self = this;
  this.store.execute(
    "LOAD <"+uri+"> INTO GRAPH <"+uri+">",
    function(success) {
      if ( !success ) {
        self.load.rejectWith( self );
        return;
      }
      self.store.graph(uri, function(found, graph) {
        if ( !found ) {
          throw "Expected to find loaded graph, but couldn't.";
        }
        self.graph = graph;
        self.load.resolveWith( self );
      });
    });
}

Document.prototype = Object.create(Queryable.prototype);

Document.prototype.query = function(query, opts, deferred) {
  deferred = deferred || $.Deferred();
  query = query.toString(opts);
  this.store.executeWithEnvironment(query, [this.uri], [], function(s, arr) {
    if ( s === true ) {
      var results = rdfstoreToSparqlResults( arr );
      deferred.resolveWith( this, [ results ] );
    } else {
      deferred.rejectWith( this, [ arr ] );
    }
  });
};

Document.prototype.load = function() {
  return this.load;
};

function rdfstoreToSparqlResults(arr) {
  if ( arr === true || arr === false ) {
    return {"head":{},"boolean":arr};
  }
  var vars = {};
  var bindings = $.map(arr, function(e) {
    var binding = {};
    for(var v in e) {
      if ( e.hasOwnProperty( v ) ) {
        vars[v] = v;
        binding[v] = {};
        binding[v].value = e[v].value;
        if ( e[v].token === "uri" ) {
          binding[v].type = "uri";
        } else if ( e[v].token === "blank" ) {
          binding[v].type = "bnode";
        } else if ( e[v].token === "literal" ) {
          binding[v].type = "literal";
          if ( e[v]['type'] !== undefined ) {
            binding[v].datatype = e[v].type;
          } else if ( e[v]['lang'] !== undefined ) {
            binding[v]["xml:lang"] = e[v].lang;
          }
        } else {
          throw "Unexpected token " + e[v].token;
        }
      }
    }
    return binding;
  });
  return {"head":{"vars":_.toArray(vars)},"results":{"bindings":bindings}};
}
