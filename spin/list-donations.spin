# -*- mode: ttl; -*-
@prefix sp: <http://spinrdf.org/sp#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

# a variable
<#id> a sp:Variable ;
  rdfs:comment "The URI identifying a donation" ;
  sp:varName "id" ;
  .

<#type> a sp:Variable ;
  rdfs:comment "The type of donation" ;
  sp:varName "type" ;
  .
<#account> a sp:Variable ;
  rdfs:comment "The account posting the donation" ;
  sp:varName "account" ;
  .

<#> a sp:Query, sp:Select ;
  rdfs:label "List Donations" ;
  rdfs:comment """
Lists all of the donations in the triple store, along with the type, text, location, and contributor.
""" ;
