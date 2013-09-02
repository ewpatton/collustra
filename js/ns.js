(function() {
  var ns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  window.RDF = {
    NS: ns,
    type: ns+"type",
    first: ns+"first",
    rest: ns+"rest",
    nil: ns+"nil"
  };
})();

(function() {
  var ns = "http://www.w3.org/2000/01/rdf-schema#";
  window.RDFS = {
    NS: ns,
    label: ns+"label",
    comment: ns+"comment"
  };
})();

(function() {
  var ns = "http://www.w3.org/2002/07/owl#";
  window.OWL = {
    NS: ns,
    Class: ns+"Class"
  };
})();

(function() {
  var ns = "http://www.w3.org/ns/sparql-service-description#";
  window.SD = {
    NS: ns,
    endpoint: ns+"endpoint"
  };
})();

(function() {
  var ns = "http://spinrdf.org/sp#";
  window.SP = {
    NS: ns,
    Asc: ns+"Asc",
    Desc: ns+"Desc",
    Query: ns+"Query",
    Select: ns+"Select",
    expression: ns+"expression",
    object: ns+"object",
    orderBy: ns+"orderBy",
    predicate: ns+"predicate",
    resultVariables: ns+"resultVariables",
    subject: ns+"subject",
    varName: ns+"varName",
    where: ns+"where"
  };
})();

(function() {
  var ns = "http://www.w3.org/2001/XMLSchema#";
  window.XSD = {
    NS: ns,
    Decimal: ns+"decimal",
    Integer: ns+"integer",
    Int: ns+"int",
    Float: ns+"float",
    Double: ns+"double",
    Short: ns+"short"
  };
})();
