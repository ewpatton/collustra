
model = new Model();
listPeople = model.createResource("http://localhost/qcri/list-people.spin#");
rdfType = model.createResource(RDF.type);
spQuery = model.createResource(SP.Query);
spSelect = model.createResource(SP.Select);
spResultVariables = model.createResource(SP.resultVariables);

listPeople.addProperty(rdfType, spQuery);
listPeople.addProperty(rdfType, spSelect);
