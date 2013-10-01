<?php

/********************************************************************************
 Section 1. general information
*********************************************************************************/

/*
author: Li Ding (http://www.cs.rpi.edu/~dingl), Zhenning Shangguan (http://www.cs.rpi.edu/~shangz)
created: October 3, 2009
modified: May 20, 2011
note: please go to line 124 and after to choose the configuration profile


MIT License

Copyright (c) 2009 -2010

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.

*/



/********************************************************************************
 Section 2.  Readme
*********************************************************************************/
/*
1. Installation

software stack
* php
* libxslt  - for native xslt translation, we currently use XSLT 1.0
* apc - for query result caching option

file depdendency - search this document for "file dependency"



2. Change Log
2011-05-20, (Li)
* update exhibit json generator (xslt) to elimitate smart parsing (detect integer). therefore, keep the type of value consistent.
* update source code to handle control characters \t (i.e. \u0009) in JSON output

2010-10-03, (Li)
* move dependency from "data-gov.tw.rpi.edu" to "logd.tw.rpi.edu", updated examples
* celeberate the 1st birthday.

2010-09-26, (Li)
* add new translation features in output, basically display the result in row/col table (not a complete html). 
   * new xslt template http://logd.tw.rpi.edu/ws/sparqlxml2tablerow.xsl.
   * new xslt template http://logd.tw.rpi.edu/ws/sparqlxml2tablecol.xsl.
  the style of the result table can be controlled by CSS class "sparqlxml2tablerow" or  "sparqlxml2tablecol" 
* processed enhancement request http://code.google.com/p/data-gov-wiki/issues/detail?id=21
    append "&ui-option=query" to a SPARQL query result to see the actual query.

2010-08-27, (Li)
* fixed bug in cache (call back) http://code.google.com/p/data-gov-wiki/issues/detail?id=7
* added one option "reset-cache=on" for reset cache 

2010-08-24, (Li)
* change default service URI 

2010-04-17, version 2010-04-17 (Li, Shangguan)
* add new parameter  "refresh-cache" 


2010-03-17, version 0.23 (Li)
* add PHP-APC based cahce for query results
* add default-graph-uri parameter which was supported by joseki based sparql endpoint
* update layout of query interface

2009-12-08, version 0.22 (Li)
* add callback function to sparql/json output

2009-11-16, version 0.21 (Li)
* support google visluziation parameters "tqx" (see http://code.google.com/apis/visualization/documentation/dev/implementing_data_source.html)
* make xslt transformation native function (require libxslt on server side)

2009-11-15, version 0.2 (Li)
* add callback parameter according to http://code.google.com/p/data-gov-wiki/issues/detail?id=3, only for Exhibit and SPARQL JSON output.
* add CSV output support according to http://code.google.com/p/data-gov-wiki/issues/detail?id=2
* RESTful service changed from sparql_uri to query-uri
* RESTful service change from service_uri to service-uri

2009-10-03, version 0.1 (Li) 
* the first version

*/


/********************************************************************************
 Section 3  Source code - Configuration
*********************************************************************************/

////////////////////////////////
// configuration - version
////////////////////////////////
ini_set("max_execution_time", "1000000");
define("ME_NAME", "SparqlProxy");
define("ME_VERSION", "2011-05-20");
define("ME_AUTHOR", "Li Ding, Zhenning Shangguan");
define("ME_CREATED", "2009-10-03");

////////////////////////////////
// configuration - * customizable section
////////////////////////////////

//title

/* CONFIG 1
define("ME_TITLE", ME_NAME ." - LOGD Sparql Endpoint");
define("ME_FILENAME", "sparql.php");
define("CONFIG_SHOW_API_DESC", false);    // whether or not show API description
define("CONFIG_SHOW_EXAMPLE", false);	// whether or not show example
define("CONFIG_LOG_QUERY", false);  // whether or not log query
define("CONFIG_PROXY_MODE", false);  //whether use this service as a proxy (always specify SPARQL endpoint)

define("SPARQL_END_POINT_DEFAULT", "http://logd.tw.rpi.edu:8890/sparql"); // without backend persistent triple store 
define("SPARQL_END_POINT_STORE_DEFAULT", "http://logd.tw.rpi.edu:8890/sparql"); // with backend persistent triple store 
define("SPARQL_QUERY_DEFAULT","
PREFIX conversion: <http://purl.org/twc/vocab/conversion/>
SELECT ?g sum( ?triples ) as ?estimated_triples
WHERE {
  GRAPH ?g  {
   ?g void:subset ?subdataset .
   ?subdataset conversion:num_triples ?triples .
  }
} 
GROUP BY ?g
");



// CONFIG 1 test
define("ME_TITLE", ME_NAME ." - LOGD Sparql Endpoint - Test");
define("ME_FILENAME", "sparqlproxy_test.php");
define("CONFIG_SHOW_API_DESC", false);    // whether or not show API description
define("CONFIG_SHOW_EXAMPLE", false);	// whether or not show example
define("CONFIG_LOG_QUERY", false);  // whether or not log query
define("CONFIG_PROXY_MODE", false);  //whether use this service as a proxy (always specify SPARQL endpoint)

define("SPARQL_END_POINT_DEFAULT", "http://logd.tw.rpi.edu:8890/sparql"); // without backend persistent triple store 
define("SPARQL_END_POINT_STORE_DEFAULT", "http://logd.tw.rpi.edu:8890/sparql"); // with backend persistent triple store 
define("SPARQL_QUERY_DEFAULT","
PREFIX conversion: <http://purl.org/twc/vocab/conversion/>
SELECT ?g sum( ?triples ) as ?estimated_triples
WHERE {
  GRAPH ?g  {
   ?g void:subset ?subdataset .
   ?subdataset conversion:num_triples ?triples .
  }
} 
GROUP BY ?g
");

*/



// CONFIG 2
define("ME_FILENAME", "sparqlproxy.php");
define("ME_TITLE", ME_NAME ." - Public Edition");
define("CONFIG_SHOW_API_DESC", true);    // whether or not show API description
define("CONFIG_SHOW_EXAMPLE", true);	// whether or not show example
define("CONFIG_LOG_QUERY", false);  // whether or not log query
define("CONFIG_PROXY_MODE", true);  //whether use this service as a proxy (always specify SPARQL endpoint)

define("SPARQL_END_POINT_DEFAULT", "http://dbpedia.org/sparql"); // without backend persistent triple store 
define("SPARQL_END_POINT_STORE_DEFAULT", "http://dbpedia.org/sparql"); // with backend persistent triple store 
define("SPARQL_QUERY_DEFAULT","
SELECT ?s ?p ?o  
WHERE {?s ?p ?o} 
LIMIT 10");


/*
// CONFIG 2 test
define("ME_FILENAME", "sparqlproxy.php");
define("ME_TITLE", ME_NAME ." - Public Edition - Test");
define("CONFIG_SHOW_API_DESC", true);    // whether or not show API description
define("CONFIG_SHOW_EXAMPLE", true);	// whether or not show example
define("CONFIG_LOG_QUERY", false);  // whether or not log query
define("CONFIG_PROXY_MODE", true);  //whether use this service as a proxy (always specify SPARQL endpoint)


define("SPARQL_END_POINT_DEFAULT", "http://dbpedia.org/sparql"); // without backend persistent triple store 
define("SPARQL_END_POINT_STORE_DEFAULT", "http://dbpedia.org/sparql"); // with backend persistent triple store 
define("SPARQL_QUERY_DEFAULT","
SELECT ?s ?p ?o  
WHERE {?s ?p ?o} 
LIMIT 10");
*/

//service url
// use .htaccess to rewrite query path. add something similar to the following into your .htaccess file
/* 
RewriteEngine On
RewriteRule ^sparql(.*)$ /ws/sparqlproxy_logd.php?$1 [L,QSA]
RewriteRule ^sparql$ /ws/sparqlproxy_logd.php
*/



// options
define("CONFIG_FIX_SPARQL_END_POINT", false);	// whether this sparql proxy only query just one specified default sparql endpoint
define("CONFIG_USE_DEFAULT_GRAPH_URI", false);	// whether use default graph URI
define("CONFIG_USE_CACHE", false);	// whether or not use cache

//cache
//define("CACHE_SECONDS_TO_LIVE", 0);
define("CACHE_SECONDS_TO_LIVE", 60*60*24);






////////////////////////////////
// configuration - file dependency
////////////////////////////////


define("XSL_JSON_GVDS","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2googlejson.xsl");
define("XSL_JSON_EXHIBIT","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2exhibitjson.xsl");
define("XSL_CSV","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2csv.xsl");
define("XSL_HTML","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2html.xsl");
define("XSL_TABLE_ROW","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2tablerow.xsl");
define("XSL_TABLE_COL","http://logd.tw.rpi.edu/ws/sparqlproxy/sparqlxml2tablecol.xsl");


////////////////////////////////
// configuration - params
////////////////////////////////

// OUTPUT format
define("OUTPUT_SPARQL_XML", "xml");
define("OUTPUT_SPARQL_HTML", "html");
define("OUTPUT_SPARQL_JSON3", "json");
define("OUTPUT_SPARQL_JSON2", "sparql");
define("OUTPUT_SPARQL_JSON", "sparqljson");
define("OUTPUT_EXHIBIT_JSON", "exhibit");
define("OUTPUT_GVDS_JSON", "gvds");
define("OUTPUT_CSV", "csv");
define("OUTPUT_SPARQL_TABLE_ROW", "tablerow");
define("OUTPUT_SPARQL_TABLE_COL", "tablecol");

function get_output_values(){
	return array (
		OUTPUT_SPARQL_XML=>"SPARQL/XML",
		OUTPUT_SPARQL_JSON=>"SPARQL/JSON",
		OUTPUT_EXHIBIT_JSON=>"EXHIBIT/JSON",
		OUTPUT_GVDS_JSON=>"GoogleViz/JSON",
		OUTPUT_CSV=>"CSV",
		OUTPUT_SPARQL_HTML=>"HTML",
		OUTPUT_SPARQL_TABLE_ROW=>"Table(Row)",
		OUTPUT_SPARQL_TABLE_COL=>"Table(Col)"
	);
}


// INPUT KEYS
define("INPUT_QUERY", "query");  
define("INPUT_QUERY_URIS", "query-uri,sparql_uri" );  
define("INPUT_QUERY_URI", "query-uri" );  
define("INPUT_DEFAULT_GRAPH_URI", "default-graph-uri" );  
define("INPUT_SERVICE_URIS", "service-uri,service_uri" );  
define("INPUT_SERVICE_URI", "service-uri" );  
define("INPUT_OUTPUT", "output");  
define("INPUT_DEBUG", "debug");  
define("INPUT_CALLBACK", "callback");  
define("INPUT_TQX", "tqx"); //for google viz
define("INPUT_TEXT_OUTPUT", "textoutput");
define("INPUT_REFRESH_CACHE", "refresh-cache");
define("INPUT_RESET_CACHE", "reset-cache");
define("INPUT_TP", "tp"); //for exhibit json
define("INPUT_QUERY_OPTION", "query-option");
define("INPUT_UI_OPTION", "ui-option");


// query options
define("VALUE_QUERY_OPTION_URI", "uri");
define("VALUE_QUERY_OPTION_TEXT", "text"); //default

define("VALUE_UI_OPTION_SHOW_RESULT", "result");//default, show result if possible
define("VALUE_UI_OPTION_SHOW_QUERY", "query");



define("XSL_URLS", 	  	 XSL_JSON_GVDS 
			. "," . XSL_JSON_EXHIBIT 
			. "," . XSL_CSV
			. "," . XSL_HTML
			. "," . XSL_TABLE_ROW
			. "," . XSL_TABLE_COL
);

define('W3C_SPARQL_RESULT_XML', 'application/sparql-results+xml');
define('W3C_SPARQL_RESULT_JSON', 'application/sparql-results+json');
define('W3C_APPLICATION_JSON', 'application/json');
define('W3C_TEXT_HTML', 'text/html');
define('W3C_TEXT_CSV', 'text/csv');




/********************************************************************************
 Section 4  Source code - main function
*********************************************************************************/
$params_control= array();
$params_control[INPUT_TEXT_OUTPUT] = get_param(INPUT_TEXT_OUTPUT);
$params_control[INPUT_DEBUG] = get_param(INPUT_DEBUG);
$params_control[INPUT_QUERY_OPTION] = get_param(INPUT_QUERY_OPTION);
$params_control[INPUT_REFRESH_CACHE] = get_param(INPUT_REFRESH_CACHE);
$params_control[INPUT_RESET_CACHE] = get_param(INPUT_RESET_CACHE);
$params_control[INPUT_UI_OPTION] = get_param(INPUT_UI_OPTION);

/*
$ctx = stream_context_create(array(
    'http' => array(
        'timeout' => 100000
        )
    )
); 
*/


if ($params_control[INPUT_RESET_CACHE]=="on"){
   apc_clear_cache();
}

//load SPARQL query
$query = get_param(INPUT_QUERY);

if ($params_control[INPUT_QUERY_OPTION]==VALUE_QUERY_OPTION_URI){
	$query=false;
}

if (empty ($query)){
        $query_uri = get_param(explode(",",INPUT_QUERY_URIS));
       
	 // load query from remove address
        if (!empty($query_uri)){
                $query=file_get_contents($query_uri);
				$params_control[INPUT_QUERY_URI] = $query_uri;
        }
}

//continue process query
$output = get_param(INPUT_OUTPUT, OUTPUT_SPARQL_XML);
$default_graph_uri = get_param(INPUT_DEFAULT_GRAPH_URI);

if (CONFIG_PROXY_MODE){
  $service_uri = get_param(explode(",",INPUT_SERVICE_URIS));
  $params_control[INPUT_SERVICE_URI] = get_param(explode(",",INPUT_SERVICE_URIS), SPARQL_END_POINT_DEFAULT);
}else{
  $service_uri = get_param(explode(",",INPUT_SERVICE_URIS), SPARQL_END_POINT_DEFAULT);
  $params_control[INPUT_SERVICE_URI] = get_param(explode(",",INPUT_SERVICE_URIS));
}


//check if service_uri is provide, it won't query non-default sparql endpoint
if (strcmp( $service_uri , CurrentPageURL() )==0 ){
	header("HTTP/1.0 400 Bad Request");
	echo "Sorry, this the SPARQL endpoint (service-uri) should not be the SPARQL proxy itself. Please go back to <a href=\"". CurrentPageURL()."\">SparqlProxy homepage</a>";
	die();
  
}



//check if service_uri is fixed, it won't query non-default sparql endpoint
if (CONFIG_FIX_SPARQL_END_POINT && strcmp(SPARQL_END_POINT_DEFAULT, $service_uri)!=0){
	header("HTTP/1.0 400 Bad Request");
	echo "Sorry, this SparqlProxy is configured not querying the specified SPARQL endpoint " . $service_uri . "Please go back to <a href=\"". CurrentPageURL()."\">SparqlProxy homepage</a>";
;
	die();
}


//show debug info if $debug is set
if ($params_control[INPUT_DEBUG]){
        echo "\n============begin debug============<br>\n";
        echo "Service uri: ".$service_uri." <br>";
	 echo "\n";
        echo "Query: ".$query." <br>";
	 echo "\n";
        echo "Output: ".$output."<br>";
	 echo "\n";
	 echo "GET: ";
	 print_r ($_GET);
	 echo "<br>\n";
	 echo "params control: ";
	 print_r ($params_control);
        echo "\n============end debug============\n";
}



// show default web content if query is empty
if (empty($query) || strcmp($params_control[INPUT_UI_OPTION], VALUE_UI_OPTION_SHOW_QUERY)==0 ){
        show_input($params_control, $query);
        die();
}
//check if service_uri is provide, it won't query non-default sparql endpoint
if (CONFIG_PROXY_MODE){
  if (strlen( $service_uri )===0 ){
	header("HTTP/1.0 400 Bad Request");
	echo "Sorry, this the SPARQL endpoint (service-uri) is not specified. Please go back to <a href=\"". CurrentPageURL()."\">SparqlProxy homepage</a>";
	die();
  }
}



// log query 
//     TODO: log the actual query
if (CONFIG_LOG_QUERY)
	log_query($query, $service_uri, $default_graph_uri, $_SERVER["REMOTE_ADDR"]);


// render query results, dispatch query to different process options
$params = array();
$params ["query"] = $query;
if (CONFIG_USE_DEFAULT_GRAPH_URI && !empty($default_graph_uri))
       $params ["default-graph-uri"] = $default_graph_uri;



switch (strtolower($output)){
        case OUTPUT_SPARQL_JSON:  
        case OUTPUT_SPARQL_JSON2:  
        case OUTPUT_SPARQL_JSON3:  
              $params ["output"] = "json";
		process_data($service_uri, $params, W3C_SPARQL_RESULT_JSON, false, false,W3C_SPARQL_RESULT_JSON, get_param(INPUT_CALLBACK),$params_control);
              break;
        case OUTPUT_SPARQL_HTML:  
		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, XSL_HTML, false, W3C_TEXT_HTML, false, $params_control);
              break;
        case OUTPUT_SPARQL_TABLE_ROW:  
		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, XSL_TABLE_ROW, false, W3C_TEXT_HTML, false, $params_control);
              break;
        case OUTPUT_SPARQL_TABLE_COL:  
		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, XSL_TABLE_COL, false, W3C_TEXT_HTML, false, $params_control);
              break;
        case OUTPUT_CSV:  
		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, XSL_CSV, false, W3C_TEXT_CSV, false, $params_control);
              break;
        case OUTPUT_EXHIBIT_JSON:  
              $xslt_input_params =array();
              if (get_param(INPUT_TP))
                   $xslt_input_params[INPUT_TP] = get_param(INPUT_TP);

		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, XSL_JSON_EXHIBIT, $xslt_input_params, W3C_APPLICATION_JSON, get_param(INPUT_CALLBACK), $params_control);
              break;
        case OUTPUT_GVDS_JSON:  
              $xslt_input_params =array();
              if (get_param(INPUT_TQX))
                   $xslt_input_params[INPUT_TQX] = get_param(INPUT_TQX);

		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML,XSL_JSON_GVDS, $xslt_input_params, W3C_APPLICATION_JSON, false, $params_control);
              break;
        case OUTPUT_SPARQL_XML:  
        default:
		process_data($service_uri, $params, W3C_SPARQL_RESULT_XML, false, false, W3C_SPARQL_RESULT_XML, false, $params_control);
              break;
}



/********************************************************************************
 Section 5  Source code - functions
*********************************************************************************/

////////////////////////////////////////
// functions - process HTTP request
////////////////////////////////////////

// get a the value of a key (mix)
function get_param($key, $default=false){
        if (is_array($key)){
                foreach ($key as $onekey){
                        $ret = get_param($onekey);
                        if ($ret)
                                return $ret;
                }
        }else{  
               
                if ($_GET)
                        if (array_key_exists($key,$_GET))
                                return $_GET[$key];
                if ($_POST)
                        if (array_key_exists($key,$_POST))
                                return $_POST[$key];    
        }
       
        return $default;
}


////////////////////////////////////////
// functions - do the data processing
////////////////////////////////////////

// download content and process it 
function process_data($service_uri, $params, $expected_input_mime_type, $xslt_uri, $xslt_input_params, $output_mime_type, $callback, $params_control){
	$debug =$params_control[INPUT_DEBUG];
	$messages = array();
	$messages ["time start"] = time();

	//build URL
	$url = build_restful_url($service_uri, $params, $debug);
	$url = $url."timeout=100000";
	
	$cachekey =$url;
	if ($xslt_uri){
		$cachekey .= ";". $xslt_uri;
	}


	if ($xslt_input_params){
  	   foreach($xslt_input_params as $p){
		$cachekey .= ";". $p;
	   }
	}

	$data=false;

	if (CONFIG_USE_CACHE && !$params_control[INPUT_REFRESH_CACHE]){
		$data = apc_fetch($cachekey );

	}	
	
	$messages ["cache hit"] = "yes";
	$messages ["cache key"] = $cachekey ;
	$forceContentType = true;
	//load data unless there is a hit in cache, or user requested a cache refresh
	if (!CONFIG_USE_CACHE || !$data ){
		$messages ["cache hit"] = "no";

/*
		//check mime type, return error message and then quit
		$mime_type = get_content_type($url);

		$messages ["remove mime type"] = $mime_type;

		// if failed

		if (!$mime_type){
			header("HTTP/1.0 400 Bad Request");
			header ("Content-Type: text/html");
			echo "<!DOCTYPE html><html><body>";
			echo "SparqlProxy Error: cannot connect to ". sprintf("<a href=\"%s\">%s</a>", $url, $url);
			echo "</body></html>";
			die();
		}

		if( strcasecmp($mime_type, $expected_input_mime_type)!=0) {
			header("HTTP/1.0 400 Bad Request");
			header ("Content-Type: text/plain");
			echo "SparqlProxy Error: unexpected content type $mime_type from $service_uri \n";
			echo get_url_contents($url);
			die();
			//stop here!
		}
*/

		//post process data
		if ($xslt_uri){
			//do xstl tranlation

			$data = xslt_transform($url, $xslt_uri, $xslt_input_params);
			if ($output_mime_type == W3C_APPLICATION_JSON){
				//replace control characters 
				$replace = array(
					"\t" => "\\t",
				); 
				$data = str_replace(array_keys($replace), array_values($replace), $data);
			}

		}else{
			//download data
                    $opts = array('http' => array( 'header' => 'Accept: text/turtle, application/rdf+xml, application/sparql-results+json, application/sparql-results+xml, application/xml, text/xml\r\n' . 'User-Agent: PHP/5.3\r\n' ) );
                    $context = stream_context_create($opts);
                    $data = @file_get_contents($url, false, $context);
                    $status = explode(" ", $http_response_header[0]);
                    if($status[1] >= 400) {
                        header("HTTP/1.1 500 Internal Server Error");
                        header("Content-Type: text/html");
                        echo "Target server returned the following status:";
                        echo "<br />" . $http_response_header;
                        return;
                    }
                    foreach($http_response_header as $value) {
                        if(preg_match('/^Content-Type:/i', $value)) {
                            header($value);
                            $forceContentType = false;
                            break;
                        }
                    }
		}

	}

	//update cache
	if (CONFIG_USE_CACHE && $data){
		//could imporve usign apc_add
		apc_store($cachekey , $data, CACHE_SECONDS_TO_LIVE);
	}	

	//process call back
	if ($callback){
			$data = $callback."($data)";
	}

	//display data
	if ($params_control[INPUT_TEXT_OUTPUT]){
		if ( $output_mime_type == W3C_TEXT_HTML)
			header ("Content-Type: " . $output_mime_type);
		else
			header ("Content-Type: text/plain");
	}else{
            if($forceContentType) {
                header ("Content-Type: " . $output_mime_type, false);
            }
	}


	echo $data;

	$messages ["time end"] = time();
	$messages ["time total"] = $messages ["time end"] - $messages ["time start"];

	if ($debug){
		print_r ($messages );
	}

}

////////////////////////////////////////
// functions - compose restful url
////////////////////////////////////////

// compose url
function build_restful_url($url, $params, $debug){
	$url .="?";
        $first = true;
	foreach ($params as $key=>$value){
		$url .=  "$key=".encode_my_url($value)."&";
	}
	if ($debug){
		echo $url;
		if (array_key_exists("query",$params)){
			echo "<pre>";
			echo $params["query"];
			echo "</pre>";
		}
	}
	
	return $url;
}

function encode_my_url($url){
        $url = urlencode($url);
        $pattern = array("%7B","%7D");
        $value = array("{","}");
        str_replace($pattern, $value, $url);
        return $url;
}

////////////////////////////////////////
// functions - download data
////////////////////////////////////////

function get_url_contents($url) {
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	$url_contents = curl_exec($ch);
	curl_close($ch);
	return $url_contents;
}


function get_content_type($url)
{
    if (empty($url))
	return false;
	
    //get headers
    $headers = get_headers($url, true);
    if ( !$headers ) {
       	echo "header is null";
	return false;
    }	

    if ( !array_key_exists("Content-Type",$headers) ) 
	return false;

    $temp =  $headers["Content-Type"];
    $temp =  strtolower(is_array($temp) ? end($temp) : $temp );
    $temp = explode(';', $temp);
    $mime_type = trim($temp[0]);	

    return $mime_type;
}




////////////////////////////////////////
// functions - run xslt tranform
////////////////////////////////////////

function xslt_transform($url_xml,$url_xsl,$params=false){	
        # LOAD XML FILE
        $XML = new DOMDocument('1.0', 'UTF-8');
/*
        if($XML->load( $url_xml )){


	echo "before change: $url_xml<br>";
	$current_data = file_get_contents($url_xml);
	echo $current_data;
	echo $url_xml;
  
        # LOAD XSL FILE
        $XSL = new DOMDocument();
        $XSL->load( $url_xsl , LIBXML_NOCDATA);
       
        # START XSLT
        $xslt = new XSLTProcessor();
       
        #load style sheet
        $xslt->importStylesheet( $XSL );
       
        #set params
	 if ($params)
	        $xslt->setParameter("", $params);

        #transform
        $data = $xslt->transformToXML( $XML );

	return $data;
	}
	else{
*/     
	//echo "before change: $url_xml<br>";



$header_array = getallheaders();
$ctx_header = "X-Forwarded-For: ".$_SERVER['REMOTE_ADDR']."\r\n";

if(array_key_exists("User-Agent", $header_array))
	      $ctx_header.="User-Agent: ".$header_array['User-Agent']."\r\n";

if(array_key_exists("Referer", $header_array))
	      $ctx_header.="Referer: ".$header_array['Referer']."\r\n";

//var_dump( $ctx_header);



$ctx = stream_context_create(array(
    'http' => array(
        'timeout' => 100000,
	'header' => $ctx_header

        )
    )
); 

	$current_data = file_get_contents($url_xml,0,$ctx);
	//echo $current_data;
	//echo $url_xml;
	
	$doc = new DOMDocument();
	if($doc->loadXML($current_data)){
       
       
        # LOAD XSL FILE
        $XSL = new DOMDocument();
        $XSL->load( $url_xsl , LIBXML_NOCDATA);
       
        # START XSLT
        $xslt = new XSLTProcessor();
       
        #load style sheet
        $xslt->importStylesheet( $XSL );
       
        #set params
	 if ($params)
	        $xslt->setParameter("", $params);

        #transform
        $data = $xslt->transformToXML( $doc );

	return $data;
	}else{
	echo "Can't load XML Document";
}
	
	
}


////////////////////////////////////////
// twitter based query logging functions
////////////////////////////////////////

// log a query to twitter, it could be slow
function log_query($query, $service_uri, $default_graph_uri, $ip){

        //run twitter
        $filename_user_pass = "/work/data-gov/local/secrete/secrete_twitter1";
        $service_dereference_name = "#" . normalize_name($service_uri);
        $datetime = date("Y-m-d\TH:i:s\Z");
       
        $status =       $service_dereference_name. " (see ". $service_uri. " ) was probed via #". ME_TITLE;
        run_twitter($filename_user_pass, $status);
       
        if (!empty($default_graph_uri)){
                $status =       $service_dereference_name. " (with data ". $default_graph_uri. " ) was probed via #". ME_TITLE;
                run_twitter($filename_user_pass, $status);
        }
       
        $status =       $service_dereference_name. " (mentioned by http://". $ip. " ) was probed via #sparqlproxy on $". ME_TITLE;
        run_twitter($filename_user_pass, $status);
}

// normalize a name 
function normalize_name($value){
        $temp = $value;
        $temp = str_replace(' ', '_', trim(preg_replace('/\W+/',' ', $temp )));
        $temp = strtolower($temp);
        if (is_numeric($temp)){
                $temp = "num".$temp;
        }
        return $temp;
}




// write data to twitter using API
function run_twitter ($filename_user_pass,  $status){
        if (file_exists($filename_user_pass)){
                $user_pass = trim(file_get_contents($filename_user_pass));
		 $command = "curl -s -u $user_pass -d \"status=$status\" http://twitter.com/statuses/update.xml" ;
                exec ($command);
        }
}


// get current page's URL
// source http://www.webcheatsheet.com/PHP/get_current_page_url.php
function CurrentPageURI()
{
$pageURI = $_SERVER['HTTPS'] == 'on' ? 'https://' : 'http://';
$pageURI .= $_SERVER['SERVER_PORT'] != '80' ? $_SERVER["SERVER_NAME"].":".$_SERVER["SERVER_PORT"].$_SERVER["REQUEST_URI"] : $_SERVER['SERVER_NAME'] . $_SERVER['REQUEST_URI'];
return $pageURI;
}

function CurrentPageURL()
{

$pageURL = array_key_exists('HTTPS',$_SERVER) && $_SERVER['HTTPS'] == 'on' ? 'https://' : 'http://';
$pageURL .= $_SERVER['SERVER_PORT'] != '80' ? $_SERVER["SERVER_NAME"].":".$_SERVER["SERVER_PORT"].$_SERVER["PHP_SELF"] : $_SERVER['SERVER_NAME'] . $_SERVER['PHP_SELF'];
return $pageURL;
}




// show default query page
function show_input( $params_control, $query){

if (empty($query)){
	$query = SPARQL_QUERY_DEFAULT;
}

?><!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
	<title><?php echo ME_TITLE; ?></title>
	<style type="text/css">
		body { font-family: sans-serif; font-size: 11pt; }
		body, html { margin: 0; padding: 0; }
		#header { margin: 0; padding: 0.8em; color: #86B9D9; }
		#footer { font-size: 8pt; margin: 0 1.8em 1em 0; text-align: center; padding: 0 12em; }
		#footer a {text-decoration: none; }
		h1 { font-weight: bold; font-size: 20pt; margin: 0; text-align: center; }
		h2, legend { font-weight: normal; font-size: 14pt; color: #86B9D9; margin: 0 0 0.2em 0; padding: 0 0 0.2em 0; }
		form {margin: 0}
		textarea { width: 100%; }
		#prefixestext { color: #555; margin: 0; }
		ul { margin: 0; padding: 0; }
		li { margin: 0 0 0 1em; padding: 0; }
		ul li a {text-decoration: none}
		.section, fieldset { margin: 0.8em; padding: 0.5em 0.8em; border: 2px solid #86B9D9; }
		.querysection {margin: 0.2em 0}
		.link{cursor: pointer; color:blue; }
              div.quote { border: dashed darkblue 1px;margin:5px; padding: 5px; font: times; background: #EEE}
	      .menuimg{  height:64px;  width:64px; position:relative;  top:0px; border:0px;	}
	</style>
	<script type="text/javascript">

	function makeChoice()
	{

		var form=document.getElementById("queryform");

		var val = 0;
		for( i = 0; i < form.queryoption.length; i++ )
		{
			if( form.queryoption[i].checked == true )
			{
				val = form.queryoption[i].value;
				if(val=='text')
				{
					form.querytext.disabled=false;
					form.queryuri.disabled=true;

					form.querytext.focus();
				}
				else
				{
					form.querytext.disabled=true;
					form.queryuri.disabled=false;

					form.queryuri.focus();
				}
			}
		}
	}


	</script>


<script type="text/javascript">
    function toggle_visibility(id) {
       var e = document.getElementById(id);
       if(e.style.display == 'block')
          e.style.display = 'none';
       else
          e.style.display = 'block';
    }
</script>

</head>

<body onload="">
	<div id="header">
		<div style="float: right; ">
			        <!-- link to logd home page -->		
					<a class"=info" href="http://logd.tw.rpi.edu/">
					<img src="http://logd.tw.rpi.edu/images/logo-twc-logd.png" alt="logd.tw.rpi.edu" class="menuimg"/></a>

			        <!-- link to demo's wiki page -->		
<!--					<a class"=info" href="<?php echo ME_FILENAME; ?>">
					<img src='http://logd.tw.rpi.edu/images/blue_home.png' class="menuimg" alt="home"/></a>
-->
			        <!-- link to demo's wiki page -->		
					<a class"=info" href="http://logd.tw.rpi.edu/technology/sparqlproxy">
					<img src='http://logd.tw.rpi.edu/images/blue_info.png' class="menuimg" alt="documentation"/></a>
			
		</div>
		<h1 id="title"> <?php echo ME_TITLE; ?> <font size="-1">  A TWC LOGD Web Service (version <?php echo ME_VERSION; ?>)</font></h1>			
	</div>
<!--	
	<div class="section" style="float: right; width: 10em; margin-top: 1.7em">
		<h2>Sample Queries</h2>
		<ul>
			<li id="browse-triple-link"><a class="link">list 10 triples</a></li>
			<li id="browse-class-link"><a class="link">list 10 classes</a></li>
			<li id="browse-property-link"><a class="link">list 10 properties</a></li>
		</ul>
	</div>
-->	
	<div style="clear:both"/>

<?php
$input_ui_option = VALUE_UI_OPTION_SHOW_RESULT;
if (array_key_exists(INPUT_UI_OPTION, $params_control)){
   $input_ui_option =$params_control[INPUT_UI_OPTION];
}

if (strcmp($input_ui_option, VALUE_UI_OPTION_SHOW_QUERY)==0){
   $url_page = CurrentPageURI();
   $url_page= str_ireplace('&ui-option=query','',$url_page);
   $message = sprintf("<div style=\"background:#DDD\">This query can be used to construct the following <a href=\"%s\">SPARQL query results</a></div>", $url_page);
   echo $message;
}

?>
	<div >
		<pre id="prefixestext"></pre>
		<fieldset>
			<legend>SPARQL Query</legend>
			<form id="queryform" Method="GET" Action="<?php echo ME_FILENAME; ?>">
<?php
$input_query_option = VALUE_QUERY_OPTION_TEXT;
if (array_key_exists(INPUT_QUERY_OPTION, $params_control)){
   $input_query_option =$params_control[INPUT_QUERY_OPTION];
}

$input_query_uri = "";
if (array_key_exists(INPUT_QUERY_URI, $params_control)){
   $input_query_uri =$params_control[INPUT_QUERY_URI];
}
?>
			<input 
<?php  
	if ( strcmp( $input_query_option,VALUE_QUERY_OPTION_URI)==0) {
		echo "checked=\"checked\" ";
	}
?>

			id="queryoption"  name="<?php echo INPUT_QUERY_OPTION; ?>" value="uri" type="radio" onclick="makeChoice();" /> Query URI:




			<input 
<?php  
	if ( strcmp( $input_query_option,VALUE_QUERY_OPTION_URI)==0) {
	} else{
		echo "disabled=\"disabled\"";
	}
?>
id ="queryuri" name="query-uri" size=100 value="<?php echo $input_query_uri; ?>" />
			<br/>





			<input 
<?php  
	if ( strcmp( $input_query_option, VALUE_QUERY_OPTION_URI)!=0) {
		echo "checked=\"checked\" ";
	} 
?>
  id="queryoption"  name="<?php echo INPUT_QUERY_OPTION; ?>" value="text" type="radio" onclick="makeChoice();" /> Query Text:



			<textarea 
<?php  
	if ( strcmp( $input_query_option, VALUE_QUERY_OPTION_URI)!=0) {
	} else{
		echo "disabled=\"disabled\"";
	}
?>
id ="querytext" name="query" cols=80 rows="15" id="query" /><?php echo $query; ?></textarea>

<?php
if (!CONFIG_FIX_SPARQL_END_POINT){


$input_service_uri = "";
if (array_key_exists(INPUT_SERVICE_URI, $params_control)){
   $input_service_uri =$params_control[INPUT_SERVICE_URI];
}

?>
			<div class="querysection">
			SPARQL End Point URL: <input id="service-uri" name="service-uri" value="<?php echo $input_service_uri; ?>" size="60" />
			</div>
<?php 
}
?>
			<div class="querysection">
			Result Format: 
<?php  

$input_output = OUTPUT_SPARQL_HTML;
if (array_key_exists(INPUT_OUTPUT, $params_control)){
   $input_output =$params_control[INPUT_OUTPUT];
}

foreach (get_output_values() as $output_value=>$output_value_text){
	if (strcmp($output_value, $input_output)==0){
		$temp_checked= "checked=\"checked\"";
	}else{
		$temp_checked= "";
	}
	$temp = sprintf ("<input %s name=\"%s\" value=\"%s\" type =\"radio\"> %s",
					$temp_checked,
					INPUT_OUTPUT,
					$output_value,
					$output_value_text
		);
	echo $temp;
}
	
?>			
			
			</div>

			
			<input type="submit" value="Run Query" />
			<a href="#" onclick="toggle_visibility('extra_params');">Show/Hide Experimental Parameters</a>


			<div id="extra_params" style="display:none">

			<fieldset>
			<legend>Experimental Parameters</legend>

			<div class="querysection">
			Refresh cache: <input type="checkbox" name="refresh-cache" /> (refresh-cache, reset this query in cache and reload it)
			</div>

			<div class="querysection">
			Reset cache: <input type="checkbox" name="reset-cache" /> (reset-cache, reset all cached queries)
			</div>

			<div class="querysection">
			Make output viewable: <input type="checkbox" id="textoutput" name="textoutput" /> (textoutput, use "text/plain" as mimetype of http response for non-html output options)
			</div>


			<div class="querysection">
			Customized Output: <input id="callback" name="<?php echo INPUT_CALLBACK; ?>" value="" size="30" /> (callback, for non-google json output,e.g. <i>myfunction</i>)
			</div>
			<div class="querysection">
			Customized Output: <input id="tqx" name="<?php echo INPUT_TQX; ?>" value="" size="30" /> (tqx, for google json output, e.g. <i>version:0.6;reqId:1;responseHandler:myQueryHandler</i>)
			</div>
<?php 
if (CONFIG_USE_DEFAULT_GRAPH_URI){
?>
			<div class="querysection">
			Default Graph URI: <input id="default-graph-id" name="default-graph-uri" size="64" value=""  /> (do not use FROM clause in query if you use this option)
			</div>
<?php 
}
?>
			<div class="querysection">
			Exhibit JSON Extension:
			<textarea id ="ExhibitJsonExtension" name="tp" cols=40 rows="5" id="query" /></textarea>
			</div>


			
			</div>
			</fieldset>
			</form>
		</fieldset>
<?php 
if (CONFIG_SHOW_API_DESC){
?>
		
		<div class="section">
			<h2>RESTful Service Interface Description</h2>
			<table style="text-align: left;"  border="1" cellpadding="2" cellspacing="2">
			  <tbody>
			    <tr>
			      <td font-weight: bold;">Parameter</td>
			      <td font-weight: bold;">Status</td>
			      <td font-weight: bold;">Description</td>
			    </tr>
			    <tr>
			      <td >service-uri</td>
			      <td >stable</td>
			      <td >URI of SPARQL service.
<!--
 values:
					<ul>
						<li> with from clause -  <?php echo SPARQL_END_POINT_DEFAULT; ?> </li>
			                     <li> without from clause - <?php echo SPARQL_END_POINT_STORE_DEFAULT; ?> </li>
-->					</ul>
                           </td> 
			    </tr>
			    <tr>
			      <td >query</td>
			      <td >stable</td>
			      <td >SPARQL query string</td>
			    </tr>
			    <tr>
			      <td >query-uri</td>
			      <td >stable</td>
			      <td >URI of SPARQL query. Note you can only use one of "query-uri" and "query" because they are mutually exclusive. </td>
			    </tr>
			    <tr>
			      <td >output</td>
			      <td >stable (optional)</td>
			      <td >the output format. Default is <i>xml</i>. All values a listed as below: <ul><?php 
      foreach (get_output_values() as $key => $value) {
      echo "<li>".$key." => ".$value."</li>";
      }
?></ul>  To keep backward comparability, both "sparqljosn" and "sparql" can be used to output SPARQL/JOSN format. </td>
			    </tr>
			    <tr>
			      <td >callback</td>
			      <td >experimental (optional)</td>
			      <td >callback function name. This param is only applicable to two output formats: <i><?php echo OUTPUT_EXHIBIT_JSON .", ". OUTPUT_SPARQL_JSON; ?></i> </td>
			    </tr>
			    <tr>
			      <td >tqx</td>
			      <td >experimental (optional)</td>
			      <td >for google visluziation api only.  e.g. <i>version:0.6;reqId:1;responseHandler:myQueryHandler</i> </td>
			    </tr>
<?php 
if (CONFIG_USE_DEFAULT_GRAPH_URI){
?>
			    <tr>
			      <td >default-graph-uri</td>
			      <td >experimental (optional)</td>
			      <td >URI of default graph. Warnining, it is only supported by JENA ARQ based SPARQL end point such as TDB. This param allow users to run SPARQL query without FROM clause over an online RDF/XML file. </td>
			    </tr>
<?php 
}
?>			    <tr>
			      <td >refresh-cache</td>
			      <td >experimental (optional)</td>
			      <td >SparqlProxy use a cache by default. User may opt out (avoid caching) by setting "refresh-cache=on" in service request </td>
			    </tr>
			    <tr>
			      <td >textoutput</td>
			      <td >experimental (optional)</td>
			      <td >set "text/plain" as content-type in HTTP response header, so users can view the result in browser. To enable it, add "textoutput=yes" in service request  </td>
			    </tr>
			    <tr>
			      <td >ui-option</td>
			      <td >experimental (optional)</td>
			      <td >SparqlProxy allow users to show the query of SPARQL query result. To enable it, add "ui-option=query" in service request </td>
			    </tr>
			  </tbody>
			</table>
<?php 
}
?>


<?php 
if (CONFIG_SHOW_EXAMPLE){
?>
	
<br/>
<br/>
			<h2>Example Usage</h2>
<div>
The following example uses <a href="http://dbpedia.org/sparql">DBpedia SPARQL endpoint</a> and the following SPARQL query (listing 10 triples, also published at <a href="http://logd.tw.rpi.edu/query/stat_list_ten_triples.sparql">http://logd.tw.rpi.edu/query/stat_ten_triples.sparql</a>)
			<div class="quote">
			http://dbpedia.org/sparql
			</div> 
			<div class="quote">
			http://logd.tw.rpi.edu/query/stat_list_ten_triples.sparql
			</div> 
			<div class="quote">
			SELECT ?s ?p ?o  WHERE {?s ?p ?o} limit 10  
			</div> 
</div>
			<ul>
			<li> Example 1: Standard SPARQL protocol. Use string value for "query" parameter. It will output XML by default. "service-uri" is set to DBPedia.
			<div class="quote">
<?php
  $myquery = CurrentPageURL() . "?query=SELECT+%3Fs+%3Fp+%3Fo++WHERE+{%3Fs+%3Fp+%3Fo}+limit+10%0D%0A&service-uri=http%3A%2F%2Fdbpedia.org%2Fsparql";
  echo sprintf("<a href=\"%s\">%s</a>",$myquery,$myquery);
?>
			</div> 
			</li>


			<li> Example 2: Use online SPARQL query. Use the URL of SPARQL file for "query-uri" parameter, and use "gvds" for "output" to output Google Visualization Compatable JSON ).
			<div class="quote">
<?php
  $myquery = CurrentPageURL() . "?query-uri=http%3A%2F%2Flogd.tw.rpi.edu%2Fquery%2Fstat_list_ten_triples.sparql&service-uri=http%3A%2F%2Fdbpedia.org%2Fsparql&output=gvds";
  echo sprintf("<a href=\"%s\">%s</a>",$myquery,$myquery);
?>
			</div> 
			</li>


			<li> Example 3: Generate HTML fragment. Use the URL of SPARQL file for "query-uri" parameter, and use "tablecol" for "output" to output a fragment of html table to be embedded in dynamic HTML page).
			<div class="quote">
<?php
  $myquery = CurrentPageURL() . "?query-uri=http%3A%2F%2Flogd.tw.rpi.edu%2Fquery%2Fstat_list_ten_triples.sparql&service-uri=http%3A%2F%2Fdbpedia.org%2Fsparql&output=tablecol";
  echo sprintf("<a href=\"%s\">%s</a>",$myquery,$myquery);
?>
			</div> 
			</li>



			<li> Example 4: refresh cache. Since query results may be cached to improve performance, users may add "refresh-cache=on" to refresh query results
			<div class="quote">
<?php
  $myquery = CurrentPageURL() . "?query-uri=http%3A%2F%2Flogd.tw.rpi.edu%2Fquery%2Fstat_list_ten_triples.sparql&service-uri=http%3A%2F%2Fdbpedia.org%2Fsparql&output=tablecol&refresh-cache=on";
  echo sprintf("<a href=\"%s\">%s</a>",$myquery,$myquery);
?>
			</div> 
			</li>

			</ul>
<?php 
}
?>

		</div>
		
		<div id="footer">
		<p>Disclaimer: 
		SparqlProxy is still in experimental status and the interface is subject to change, so please use it with caution. 
		We may monitor service usage, so your service request could be recorded and publicized at, e.g. on <a href="http://twitter.com/sparqlproxy">twitter</a>. 
		Should you have any questions, please contact us or post an issue at <a href="http://code.google.com/p/data-gov-wiki/issues/list">our issue tracking list</a>. </p>
		<p>SparqlProxy is maintained by: <a href="http://www.cs.rpi.edu/~dingl">Li Ding</a> and <a href="http://www.cs.rpi.edu/~shangz">Zhenning Shangguan</a> from the <a href="http://tw.rpi.edu">Tetherless World Constellation</a> at <a href="http://www.rpi.edu/">Rensselaer Polytechnic Institute</a></p>
		</div>
</body>
</html><?php  
}  


?>
