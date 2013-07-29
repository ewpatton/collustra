(function() {
  var ns = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
  window.RDF = {
    NS: ns,
    type: ns+"type"
  };
})();

(function() {
  var ns = "http://www.w3.org/2000/01/rdf-schema#";
  window.RDFS = {
    NS: ns,
    label: ns+"label",
    comment: ns+"comment",
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
  var ns = "http://www.w3.org/ns/sparql-service-description#";
  window.SP = {
    NS: ns,
    Query: ns+"Query",
    Select: ns+"Select",
    resultVariables: ns+"resultVariables"
  };
})();
