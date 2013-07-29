# -*- mode: ttl; -*-
@base <http://projects.evanpatton.com/qcri/queries/list-people.spin> .
@prefix sp: <http://spinrdf.org/sp#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# a variable
<#id> a sp:Variable ;
  rdfs:comment "The URI identifying a person" ;
  sp:varName "id" ;
  .

<#given> a sp:Variable ;
  rdfs:comment "Given name for a person" ;
  sp:varName "given" ;
  .

<#family> a sp:Variable ;
  rdfs:comment "Family name for a person" ;
  sp:varName "family" ;
  .

<#account> a sp:Variable ;
  rdfs:comment "Account name held by this person" ;
  sp:varName "account"
  .

<#> a sp:Query, sp:Select ;
  rdfs:label "List People"@en ;
  rdfs:comment """
Lists all people in the triple store along with their given and family names and any online accounts they hold.
""" ;
  sp:resultVariables (<#id> <#given> <#family> <#account>);
  sp:where ([ sp:subject   <#id> ;
              sp:predicate rdf:type ;
              sp:object    foaf:Person ]
            [ sp:subject   <#id> ;
              sp:predicate foaf:givenName ;
              sp:object    <#given> ]
            [ sp:subject   <#id> ;
              sp:predicate foaf:familyName ;
              sp:object    <#family> ]
            [ sp:subject   <#id> ;
              sp:predicate foaf:holdsAccount ;
              sp:object    <#account> ]) ;
  sp:orderBy ( [ a sp:Asc ; sp:expression <#family> ]
               [ a sp:Asc ; sp:expression <#given> ] ) ;
  .
