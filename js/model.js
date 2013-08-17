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

/**
 * Returns a projection (if a number) or a variable (if string)
 */
Query.prototype.getVariable = function(varid) {
  if ( typeof varid == "string" ) {
    return this.variables[varid];
  } else if ( typeof varid == "number" ) {
    return this.projections[varid];
  } else {
    throw "Unexpected varid '"+varid+"' in Query.getVariable";
  }
}

Query.prototype.toString = function(opts) {
  var result = "";
  if ( this.type == QueryType.Select ) {
    for( var prefix in PrefixHelper.namespaces ) {
      result += "PREFIX " + prefix.toLowerCase() + ": <" +
        PrefixHelper.namespaces[prefix] + ">\n";
    }
    result += "SELECT";
    if ( this.projections.length == 0 ) {
      result += " *";
    } else {
      for ( var i = 0; i < this.projections.length; i++ ) {
        result += " ";
        result += this.projections[i].toString();
      }
    }
    result += " WHERE {\n";
    for ( var i = 0; i < this.where.length; i++ ) {
      result += this.where[i].toString( i ? this.where[i-1] : null );
    }
    result += "\n}";
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
  var vars = graph.match(qnode, store.rdf.createNamedNode(SP.resultVariables))
    .toArray();
  if ( vars.length > 0 ) {
    vars = rdfListToArray(store, graph, vars[0].object);
    var varName = store.rdf.createNamedNode(SP.varName);
    for(var i=0; i<vars.length; i++) {
      var name = graph.match(vars[i], varName).toArray();
      var projection = new Query.Variable(vars[i].nominalValue,
                                          name[0].object.nominalValue)
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
  var where = graph.match(qnode, store.rdf.createNamedNode(SP.where)).toArray();
  where = rdfListToArray(store, graph, where[0].object);
  var subj = store.rdf.createNamedNode(SP.subject);
  var pred = store.rdf.createNamedNode(SP.predicate);
  var obj = store.rdf.createNamedNode(SP.object);
  for(var i=0; i<where.length;i ++) {
    // TODO this block assumes that everything in the where clause is a triple
    // pattern, which is not necessarily true (e.g. OPTIONAL, FILTER, etc.)
    var triple = where[i];
    var s = graph.match(triple, subj).toArray();
    if ( s.length > 0 ) {
      var svar = isVariable(store, graph, s[0].object);
      var p = graph.match(triple, pred).toArray();
      var pvar = isVariable(store, graph, p[0].object);
      var o = graph.match(triple, obj).toArray();
      var ovar = isVariable(store, graph, o[0].object);
      if ( svar ) {
        svar = new Query.Variable(s[0].object.nominalValue, svar);
        if ( query.variables[svar.varName] == undefined ) {
          query.variables[svar.varName] = svar;
        } else {
          svar = query.variables[svar.varName];
        }
      } else {
        svar = new Query.Resource(s[0].object.nominalValue,
                                  s[0].object.interfaceName == "BlankNode");
      }
      if ( pvar ) {
        pvar = new Query.Variable(p[0].object.nominalValue, pvar);
        if ( query.variables[pvar.varName] == undefined ) {
          query.variables[pvar.varName] = pvar;
        } else {
          pvar = query.variables[pvar.varName];
        }
      } else {
        pvar = new Query.Resource(p[0].object.nominalValue,
                                  p[0].object.interfaceName == "BlankNode");
      }
      if ( ovar ) {
        ovar = new Query.Variable(o[0].object.nominalValue, ovar);
        if ( query.variables[ovar.varName] == undefined ) {
          query.variables[ovar.varName] = ovar;
        } else {
          ovar = query.variables[ovar.varName];
        }
      } else {
        if ( o[0].object.interfaceName == "Literal" ) {
          var type = null;
          if ( o[0].object.language ) {
            type = { "lang": o[0].object.language };
          } else if ( o[0].object.datatype ) {
            type = { "datatype": o[0].object.datatype };
          }
          ovar = new Query.Literal(o[0].object.nominalValue, type);
        } else {
          ovar = new Query.Resource(o[0].object.nominalValue,
                                    o[0].object.interfaceName == "BlankNode");
        }
      }
      query.where.push(new Query.BasicGraphPattern(svar, pvar, ovar));
    }
  }
  var ordering = graph.match(qnode, store.rdf.createNamedNode(SP.orderBy))
    .toArray();
  if ( ordering.length > 0 ) {
    ordering = rdfListToArray(store, graph, ordering[0].object);
    var rdfType = store.rdf.createNamedNode(RDF.type);
    var spExpression = store.rdf.createNamedNode(SP.expression);
    $.each(ordering, function(i, order) {
      var triples = graph.match(order, rdfType).toArray();
      if ( triples.length > 0 ) {
        if ( triples[0].object.nominalValue == SP.Asc ) {
          triples = graph.match(order, spExpression).toArray();
          var ex = expressionToObject( store, graph, query, triples[0].object );
          query.order.push( new Query.OrderBy( Query.Order.ASC, ex ) );
        } else if ( triples[0].object.nominalValue == SP.Desc ) {
          triples = graph.match(order, spExpression).toArray();
          var ex = expressionToObject( store, graph, query, triples[0].object );
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
  var queryType = null;
  var query = null;
  for(var i=0; i<types.length; i++) {
    var t = types[i].object;
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
};

})();

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

Query.Variable.prototype.clone = function() {
  var copy = new Query.Variable(this.uri, this.varName);
  return copy;
}

Query.Variable.prototype.equals = function(other) {
  if ( other == null ) {
    return false;
  } else if ( !( other instanceof Query.Variable ) ) {
    return false;
  } else if (other == this) {
    return true;
  }
  return this.uri == other.uri && this.varName == other.varName;

}

Query.Order = {"ASC": 1, "DESC": 0}

Query.OrderBy = function(dir, ex) {
  this.direction = dir;
  this.expression = ex;
};

Query.OrderBy.prototype.toString = function() {
  var result = null;
  if ( this.direction == Query.Order.ASC ) {
    result = "ASC(";
  } else {
    result = "DESC(";
  }
  result += this.expression.toString();
  result += ")";
  return result;
}

Query.OrderBy.prototype.clone = function() {
  var copy = new Query.OrderBy(this.direction, this.expression);
  return copy;
}

Query.JoinedQueryType = {
  "Substitution": 0,
  "Subquery": 1,
  "Service": 2
};

Query.JoinedVariable = function(query1, query2, type) {
  this.uri = query1.variable.uri;
  this.varName = query1.variable.varName;
  this.orgQuery = query1;
  this.joinedTo = query2;
  this.joinType = type || Query.JoinedQueryType.Substitution;
}

Query.JoinedVariable.prototype = Object.create(Query.Variable.prototype);
Query.JoinedVariable.prototype.toString = function() {
  return "?"+this.varName;
}

/**
 * @class Resource
 * @memberof Query
 * @classdesc
 * Resource
 */
Query.Resource = function(uri, isBnode) {
  this.uri = uri;
  this.bnode = isBnode;
}

Query.Resource.prototype.toString = function(namespaces) {
  var curie = PrefixHelper.compact(this.uri, namespaces);
  return curie || "<" + this.uri + ">";
}

Query.Resource.prototype.clone = function() {
  var copy = new Query.Resource(this.uri, this.bnode);
  return copy;
}

Query.Resource.prototype.equals = function(other) {
  if ( other == null ) {
    return false;
  } else if ( !( other instanceof Query.Resource ) ) {
    return false;
  } else if ( this == other ) {
    return true;
  }
  return this.uri == other.uri && this.bnode == other.bnode;
};

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
    if(previous.subject.equals( this.subject )) {
      if(previous.predicate.equals( this.predicate )) {
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
      return this.subject.toString() + " a " + this.object.toString() + " ";
    } else {
      return this.subject.toString() + " " +
        this.predicate.toString() + " " +
        this.object.toString() + " "
    }
  }
}

Query.BasicGraphPattern.prototype.clone = function() {
  var copy = new Query.BasicGraphPattern();
  copy.subject = this.subject;
  copy.predicate = this.predicate;
  copy.object = this.object;
  return copy;
}

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
}

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
}

Query.prototype.clone = function() {
  var copy = new Query();
  copy.uri = this.uri;
  copy.type = this.type;
  copy.projections = cloneArray(this.projections);
  copy.where = cloneArray(this.where);
  copy.order = cloneArray(this.order);
  copy.product = cloneArray(this.product);
  copy.deletes = cloneArray(this.deletes);
  copy.target = this.target
  copy.variables = cloneDict(this.variables);
  if ( this.label ) {
    copy.label = this.label;
  }
  if ( this.endpoint ) {
    copy.endpoint = this.endpoint;
  }
  if ( this.prefixes ) {
    copy.prefixes = cloneDict( this.prefixes );
  } else {
    copy.prefixes = {};
  }
  return copy;
}

Query.JoinedQuery = function(query1, query2, type) {
  type = type || Query.JoinedQueryType.Substitution;
  // this won't be a valid URI, but it is internal for now.
  this.uri = query1.query.uri + query2.query.type;
  this.type = query1.query.type;
  this.projections = [];
  this.joinType = type;
  var map = {};
  var map2 = {};
  this.joinVariable = new Query.JoinedVariable(query1, query2, type);
  map[query1.variable.varName] = this.joinVariable;
  map2[query2.variable.varName] = this.joinVariable;
  for ( var i = 0; i < query1.query.projections.length; i++ ) {
    if ( query1.variable.equals( query1.query.projections[i] ) ) {
      this.projections.push( this.joinVariable );
    } else {
      var copy = query1.query.projections[i].clone();
      map[copy.varName] = copy;
      this.projections.push( copy );
    }
  }
  for ( var i = 0; i < query2.query.projections.length; i++ ) {
    if ( query2.variable.equals( query2.query.projections[i] ) ) {
      // joining here, but it is already in this.projections so just continue
      continue;
    } else {
      var copy = query2.query.projections[i].clone();
      while ( map[copy.varName] != undefined ||
              map2[copy.varName] != undefined ) {
        var idx = copy.varName.search(/[0-9]+$/);
        if ( idx >= 0 ) {
          var count = parseInt( copy.varName.substr( idx ) );
          copy.varName = copy.varName.substr( 0, idx ) +
            ( count + 1 );
        } else {
          copy.varName += "1";
        }
      }
      map2[query2.query.projections[i].varName] = copy;
      this.projections.push( copy );
    }
  }
  this.where = [];
  this.order = [];
  if ( type == Query.JoinedQueryType.Substitution ) {
    // TODO this mechanism does not yet rename non-projected variables
    for ( var i = 0; i < query1.query.where.length; i++ ) {
      var copy = query1.query.where[i].clone();
      copy.subject = map[copy.subject.varName] || copy.subject;
      copy.predicate = map[copy.predicate.varName] || copy.predicate;
      copy.object = map[copy.object.varName] || copy.object;
      this.where.push( copy );
    }
    for ( var i = 0; i < query2.query.where.length; i++ ) {
      var copy = query2.query.where[i].clone();
      copy.subject = map2[copy.subject.varName] || copy.subject;
      copy.predicate = map2[copy.predicate.varName] || copy.predicate;
      copy.object = map2[copy.object.varName] || copy.object;
      this.where.push( copy );
    }
    for ( var i = 0; i < query1.query.order.length; i++ ) {
      var copy = query1.query.order[i].clone();
      if ( copy.expression instanceof Query.Variable ) {
        copy.expression = map[copy.expression.varName];
      }
      if ( copy["expression"] == undefined ) {
        throw "Expected an order expression to be a projected variable";
      }
      this.order.push( copy );
    }
    for ( var i = 0; i < query2.query.order.length; i++ ) {
      var copy = query2.query.order[i].clone();
      if ( copy.expression instanceof Query.Variable ) {
        copy.expression = map2[copy.expression.varName];
      }
      if ( copy["expression"] == undefined ) {
        throw "Expected an order expression to be a projected variable";
      }
      this.order.push( copy );
    }
  }
  this.product = [];
  this.deletes = [];
  this.target = query1.query.target;
  this.variables = $.extend({}, map, map2);
  this.label = query1.query.label + " joined with " + query2.query.label;
  this.comment = query1.query.comment;
  // Will not work when joining a query with joined query, you'll get
  // something like [ endpoint3, [ endpoint1, endpoint2 ] ]
  if ( query1.query.endpoint == query2.query.endpoint ) {
    this.endpoint = query1.query.endpoint;
  } else {
    this.endpoint = [ query1.query.endpoint, query2.query.endpoint ];
  }
};

Query.JoinedQuery.prototype = new Query();
