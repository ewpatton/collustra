# -*- mode: ttl; -*-
@base <http://projects.evanpatton.com/qcri/queries/list-donations.spin> .
@prefix sp: <http://spinrdf.org/sp#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix sioc: <http://rdfs.org/sioc/ns#> .
@prefix e1: <http://dig.csail.mit.edu/2012/QCRI-DIG-project/source/Projects/dataset/qcri-disaster-management/vocab/enhancement/1/> .
@prefix geo: <http://www.w3.org/2003/01/geo/wgs84_pos#> .
@prefix dc: <http://purl.org/dc/terms/> .

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

<#date> a sp:Variable ;
  rdfs:comment "The date and time of the posting" ;
  sp:varName "date" ;
  .

<#text> a sp:Variable ;
  rdfs:comment "The text of the posting" ;
  sp:varName "text" ;
  .

<#lat> a sp:Variable ;
  rdfs:comment "The latitude where the post was made" ;
  sp:varName "lat" ;
  .

<#long> a sp:Variable ;
  rdfs:comment "The longitude where the post was made" ;
  sp:varName "long" ;
  .

<#> a sp:Query, sp:Select ;
  rdfs:label "List Donations" ;
  rdfs:comment """
Lists all of the donations in the triple store, along with the type, text, location, and contributor.
""" ;
  sp:resultVariables (<#id> <#account> <#date> <#type> <#lat> <#long> <#text>) ;
  sp:where ([ sp:subject <#id> ;
              sp:predicate rdf:type ;
              sp:object sioc:MicroblogPost ]
            [ sp:subject <#id> ;
              sp:predicate sioc:content ;
              sp:object <#text> ]
            [ sp:subject <#id> ;
              sp:predicate e1:need_type ;
              sp:object <#type> ]
            [ sp:subject <#id> ;
              sp:predicate geo:lat ;
              sp:object <#lat> ]
            [ sp:subject <#id> ;
              sp:predicate geo:long ;
              sp:object <#long> ]
            [ sp:subject <#id> ;
              sp:predicate dc:date ;
              sp:object <#date> ]
            [ sp:subject <#id> ;
              sp:predicate sioc:has_creator ;
              sp:object <#account> ]) ;
  sp:orderBy ([ a sp:Desc ; sp:expression <#date> ]) ;
  .
