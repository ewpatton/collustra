
var SpinHelper = {
  expressionToSPARQL: function(store, graph, expression) {
    var spVarName = store.rdf.createNamedNode(SP.varName);
    var name = graph.match(expression, spVarName).toArray();
    if(name.length === 0) {
      throw "Only variables supported as expressions right now.";
    }
    return "?"+name[0].object.nominalValue;
  },
  /**
   * @deprecated
   * @see Query#toString
   */
  toSPARQL: function(store, graph, uri, opts) {
    var query = "";
    var node = store.rdf.createNamedNode(uri);
    var rdfType = store.rdf.createNamedNode(RDF.type);
    var spVarName = store.rdf.createNamedNode(SP.varName);
    var triples = graph.match(node, rdfType).toArray();
    $.map(triples, function(t) {
      if(t.object.nominalValue === SP.Select) {
        query += "SELECT ";
      } else if (t.object.nominalValue === SP.Query ) {
        return;
      } else {
        throw "Unexpected query type: "+t.object.nominalValue;
      }
    });
    triples = graph.match(node, store.rdf.createNamedNode(SP.resultVariables)).toArray();
    if(triples.length === 0) {
      query += "*";
    } else {
      var variables = rdfListToArray(store, graph, triples[0].object);
      $.map(variables, function(n) {
        triples = graph.match(n, store.rdf.createNamedNode(SP.varName)).toArray();
        query += "?"+triples[0].object.nominalValue+" ";
      });
    }
    triples = graph.match(node, store.rdf.createNamedNode(SP.where)).toArray();
    if(triples.length === 0) {
      throw "Expected where clause for select query, found none.";
    }
    query += " WHERE { ";
    var bgps = rdfListToArray(store, graph, triples[0].object);
    $.map(bgps, function(bgp) {
      var types = graph.match(bgp, rdfType).toArray();
      if( types.length === 0 ) {
        var spSubject = store.rdf.createNamedNode(SP.subject);
        var spPredicate = store.rdf.createNamedNode(SP.predicate);
        var spObject = store.rdf.createNamedNode(SP.object);
        var subject = graph.match(bgp, spSubject).toArray();
        var predicate = graph.match(bgp, spPredicate).toArray();
        var object = graph.match(bgp, spObject).toArray();
        // could collect BGPs here to create a more compact TTL representation
        var subIsVar = graph.match(subject[0].object, spVarName).toArray();
        var predIsVar = graph.match(predicate[0].object, spVarName).toArray();
        var objIsVar = graph.match(object[0].object, spVarName).toArray();
        if( subIsVar.length > 0 ) {
          query += "?"+subIsVar[0].object.nominalValue+" ";
        } else {
          query += "<"+subject[0].object.nominalValue+"> ";
        }
        if( predIsVar.length > 0 ) {
          query += "?"+predIsVar[0].object.nominalValue+" ";
        } else {
          query += "<"+predicate[0].object.nominalValue+"> ";
        }
        if( objIsVar.length > 0 ) {
          query += "?"+objIsVar[0].object.nominalValue+" ";
        } else {
          query += "<"+object[0].object.nominalValue+"> ";
        }
        query += ". ";
      } else {
        throw "Patterns other than triple patterns not yet supported.";
      }
    });
    query += " } ";
    triples = graph.match(node, store.rdf.createNamedNode(SP.orderBy)).toArray();
    if(triples.length > 0) {
      query += "ORDER BY ";
      var ordering = rdfListToArray(store, graph, triples[0].object);
      var spExpression = store.rdf.createNamedNode(SP.expression);
      $.map(ordering, function(order) {
        triples = graph.match(order, rdfType).toArray();
        if(triples.length > 0) {
          if(triples[0].object.nominalValue === SP.Asc) {
            triples = graph.match(order, spExpression).toArray();
            query += "ASC(";
            query += SpinHelper.expressionToSPARQL(store, graph, triples[0].object);
            query += ") ";
          } else if(triples[0].object.nominalValue === SP.Desc) {
            triples = graph.match(order, spExpression).toArray();
            query += "DESC(";
            query += SpinHelper.expressionToSPARQL(store, graph, triples[0].object);
            query += ") ";
          } else {
            console.warn("Unexpected type while ordering: "+triples[0].object.nominalValue);
          }
        }
      });
    }
    if(opts !== undefined) {
      if("offset" in opts) {
        query += "OFFSET "+opts.offset;
      }
      if("limit" in opts) {
        query += "LIMIT "+opts.limit;
      }
    }
    return query;
  }
};
