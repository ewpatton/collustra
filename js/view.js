/**
 * @overview
 * View.js provides user interface functionality for Collustra. It uses the
 * jQuery and jQueryUI frameworks to provide drag-and-drop functionality for
 * constructing SPARQL queries. It also provides mechanisms for visualizing
 * results in different ways.
 * @copyright © 2013 Evan W. Patton
 * @license
 * Released under the MIT license
 * {@link https://raw.github.com/ewpatton/collustra/master/LICENSE}
 * @file
 */
/**
 * View provides the user interface logic for Collustra.
 * @namespace
 */
var View = {
  /**
   * @class
   * @classdesc
   * View.Endpoints provides functionality to add, edit, and remove endpoints to
   * Collustra's model. It will also configure HTML5 drag and drop so that users
   * can drag links to external SPARQL endpoints directly into the application
   * to bootstrap the discovery and construction process.
   */
  Endpoints: (function() {
    /**
     * Handles when a user drops a URL into the endpoint view.
     * @memberof View.Endpoints
     * @private
     * @param {jQuery.Event} event A jQuery event wrapping the HTML5 drop event
     * from the browser.
     * @returns false to cancel the default browser behavior
     */
    var dropUrl = function(event) {
      var items = event.dataTransfer.items;
      for(var i=0;i<items.length;i++) {
        if(items[i].type == "text/uri-list") {
          items[i].getAsString(function(url) {
            App.Endpoints.loadEndpointDescription(url)
              .then(View.Endpoints.refresh(),
                    function() {
                      View.Endpoints.showDialogForEndpoint(url)
                        .then(View.Endpoints.refresh);
                    });
          });
        }
      }
      if (event.preventDefault) { event.preventDefault(); }
      return false;
    };

    /**
     * Configures the HTML5 drop events for the endpoint view.
     * @memberof View.Endpoints
     * @private
     **/
    var configureEndpointDrop = function() {
      $("#endpoints").bind("dragover", function(event) {
        event.stopPropagation();
        return false;
      }).bind("drop", dropUrl);
    };

    /**
     * Stores a deferred for the endpoint dialog.
     * @type jQuery.Deferred
     * @memberof View.Endpoints
     * @private
     */
    var endpointDialogDeferred = null;

    /**
     * Stores the original URI used to open the endpoint dialog.
     * @type string
     * @memberof View.Endpoints
     * @private
     */
    var endpointDialogURI = null;

    /**
     * Creates a new &lt;option&gt; element for adding to the select element
     * in the endpoint view.
     * @memberof View.Endpoints
     * @private
     * @param {string} uri URI of the endpoint to create an &lt;option&gt;
     * element for in the select element.
     */
    var create = function(uri) {
      var endpoint = App.Endpoints.getEndpoint(uri);
      $("#endpoints").find("option.default").remove();
      var opt = $("<option>");
      opt.val(uri).text(endpoint.label);
      if(endpoint["comment"]) {
        opt.attr("tooltip",endpoint.comment);
      }
      opt.appendTo("#endpoints select");
    };

    return {
      /**
       * Initializes the endpoint viewport.
       * @memberof View.Endpoints
       */
      init: function() {
        var opts =
          {modal:true,draggable:false,resizable:false,
           width:600,title:"SPARQL Endpoint Options",
           autoOpen: false, buttons:
           [{text: "Cancel", click: function() {
             $( this ).dialog( "close" );
             if ( endpointDialogDeferred ) {
               endpointDialogDeferred
                 .rejectWith( window, [ uri, "Cancelled by user." ] );
             }
           }},
            {text: "Save", click: function() {
              var newUri, newLabel, newComment;
              newUri = $( this ).find( "[name='endpoint-url']" ).val();
              newLabel = $( this ).find( "[name='endpoint-label']" ).val();
              newComment = $( this ).find( "[name='endpoint-comment']" ).val();
              $( "#endpoints option.default" ).remove();
              $( this ).dialog( "close" );
              if ( create ) {
                App.Endpoints.addEndpoint(newUri, newLabel, newComment);
              } else {
                App.Endpoints.updateEndpoint(endpointDialogURI, newUri,
                                             newLabel, newComment);
              }
              if ( endpointDialogDeferred ) {
                endpointDialogDeferred.resolveWith( window, [ uri ] );
              }
            }}
           ]};
        $("#endpoint-dialog").dialog(opts);
        $(window).bind("new_endpoint",function(event, uri) {
          create(uri);
        });
        configureEndpointDrop();
      },
      /**
       * Shows the endpoint dialog for a given URI and an optional deferred
       * object to resolve once the user dismisses the dialog.
       * @param {string} uri URI for the endpoint to display
       * @param {jQuery.Deferred|null} newDeferred If given, the deferred
       * object will be resolved or rejected once the user completes the form
       * or cancels it.
       * @returns {jQuery.Promise} Either a fresh jQuery promise or one
       * created by calling newDeferred's promise method.
       * @memberof View.Endpoints
       */
      showDialogForEndpoint: function(uri, newDeferred) {
        deferred = newDeferred || $.Deferred();
        var endpoint = App.Endpoints.getEndpoint(uri);
        var create = endpoint == null;
        if ( endpoint == null ) {
          endpoint = {"uri": uri, "label": "", "comment": ""};
        }
        var dialog = $("#endpoint-dialog");
        dialog.find("[name='endpoint-url']").val(uri);
        dialog.find("[name='endpoint-label']").val(endpoint["label"]);
        dialog.find("[name='endpoint-comment']").val(endpoint["comment"]);
        dialog.dialog("open");
        return deferred.promise();
      },
      /**
       * Refreshes the endpoint view.
       * @param {string} uri
       * @param {jQuery.Deferred|null} deferred
       * @returns {jQuery.Promise}
       * @memberof View.Endpoints
       */
      refresh: function(uri, deferred) {
        if ( uri != null && typeof uri == "object" ) {
          deferred = uri;
          uri = null;
        }
        deferred = deferred || $.Deferred();
        return deferred.promise();
      }
    };
    // end Endpoints
  })(),
  /**
   * @class
   * @classdesc
   * QueryList manages the list of queries and concepts.
   * @memberof View
   */
  QueryList: (function() {
    /**
     * Generates a draggable helper to represent a query dragged from the query
     * list to the query canvas.
     * @returns {jQuery} A jQuery object wrapping a &lt;div&gt; element.
     * @memberof View.QueryList
     * @private
     */
    var helper = function() {
      var self = $(this);
      var elem = $("<div>");
      elem.append("<span>");
      elem.find("span").attr("comment",self.attr("comment")).text(self.text());
      return elem;
    };

    /**
     * Helper function to handle the selection mechanism.
     * @param {jQuery.Event} event A jQuery event representing a mouse event
     * @param {object} ui A jQueryUI event object
     * @memberof View.QueryList
     * @private
     */
    var doSelect = function(event, ui) {
      if ( $(this).hasClass("ui-selected") ) $(this).removeClass("ui-selected");
    }

    /**
     * Options passed to $.draggable in the query list
     * @memberof View.QueryList
     * @private
     */
    var dragOpts ={"helper":"clone","appendTo":"body","helper":helper,
                   "start":doSelect,"revert":"invalid"};
    return {
      /**
       * Initializes the query list, including the tabs interface and event
       * handlers.
       * @memberof View.QueryList
       */
      init: function() {
        $("div#query-list").tooltip({"show":{"delay":1000},"items":"li",
                                     "content":function() {
                                       return $(this).attr("comment")
                                     }});
        $("div#query-list ul").on('click', "li.query-item", function(event) {
          $(event.target).parent().find(".ui-selected").removeClass("ui-selected");
          $(event.target).addClass("ui-selected");
          $(window).trigger("query_selected", [$(event.target)]);
        });
        $("#query-tabs").tabs();
        $(".tabs-bottom .ui-tabs-nav, .tabs-bottom .ui-tabs-nav > *")
          .removeClass("ui-corner-all ui-corner-top")
          .addClass("ui-corner-bottom");
        $(".tabs-bottom .ui-tabs-nav").removeClass("ui-corner-bottom");
        $(".tabs-bottom .ui-tabs-nav").appendTo(".tabs-bottom");
        $(window).bind("new_endpoint", function(event, uri) {
          App.QueryList.loadQueriesFromEndpoint( uri )
            .then(View.QueryList.refresh, View.showError);
        });
      },
      /**
       * Refreshes the list of queries and concepts, usually in response to an
       * endpoint being added or removed
       * @memberof View.QueryList
       */
      refresh: function() {
        var queries = App.QueryList.getQueries();
        var ul = $("#query-list #stored-queries ul");
        for(var uri in queries) {
          var li = ul.find("li[uri='"+uri+"']");
          if(li.length == 0) {
            li = $("<li>");
            li.addClass("query-item ui-widget-content");
            li.attr("uri", uri);
            li.text(queries[uri].label);
            if(queries[uri]["comment"] != undefined) {
              li.attr("comment", queries[uri].comment);
            }
            li.appendTo(ul);
            li.draggable(dragOpts);
          }
        }
      }
    };
    // end QueryList
  })(),
  /**
   * @class
   * @classdesc
   * The Canvas renders the projections of queries and also provides mechanisms
   * for users to extend the queries by exploring the underlying data or by
   * taking advantage of loaded schema.
   * @memberof View
   */
  Canvas: (function() {
    /**
     * Provides CSS animation when the user crosses the boundary between the
     * query list and the canvas.
     * @param {jQuery.Event} event A jQuery event representing a mouse event
     * @param {object} ui jQuery UI object
     * @memberof View.Canvas
     * @private
     */
    var animateDragOver = function(event, ui) {
      ui.helper.addClass("drag-query", 200);
    }

    /**
     * Provides CSS animation when the user crosses the boundary between the
     * query list and the canvas.
     * @param {jQuery.Event} event A jQuery event representing a mouse event
     * @param {object} ui jQuery UI object
     * @memberof View.Canvas
     * @private
     */
    var animateDragOut = function(event, ui) {
      ui.helper.removeClass("drag-query", 200);
    }

    /**
     * Helper function handles when a user drops a query object from the query
     * list.
     * @param {jQuery.Event} event A jQuery event representing a mouse event
     * @param {object} ui jQuery UI object
     * @memberof View.Canvas
     * @private
     */
    var drop = function(event, ui) {
      var self = $(this);
      var query = ui.helper.clone().appendTo(self)
        .draggable({"containment":"parent"}).addClass("query")
        .removeClass("drag-query ui-draggable-dragging");
      query.position(ui.position);
      query.disableSelection();
      var div = $("<div>");
      query.append(div);
      div.addClass("vars");
      var uri = ui.draggable.attr("uri");
      var queryInfo = App.QueryList.getQueries()[uri];
      $.each(queryInfo.projections,
             function(i, value) {
               var span = $("<div>");
               div.append(span);
               span.text(value["varName"]);
               span.tooltip({"show":{delay:"1000"},"items":"*",
                             "content":value["comment"]});
             });
      var queryId = App.QueryCanvas.instantiate(uri);
      div.attr("queryId", queryId);
      $(window).trigger("dropped_query", [queryId]);
    };

    return {
      /**
       * Initializes the canvas. Registers droppable for the canvas element.
       * @memberof View.Canvas
       */
      init: function() {
        $("div#canvas").droppable(
          {accept: "li.query-item", activeClass: "drop-here",
           hoverClass: "drop-now", drop: drop,
           over: animateDragOver, out: animateDragOut
          });
      }
    };
  })(),
  /**
   * @class
   * @classdesc
   * QueryResults provides an interface to render the results of queries in a
   * tabular view. Queries can be reordered in the view by dragging the headers.
   * Variables can be dragged within a table to reorder the variables in the
   * result set or they can be dragged between queries to create join patterns.
   * @memberof View
   * @todo Move to a separate file once issue #5 is completed. Implement the
   * API defined to satisfy #5.
   */
  QueryResults: (function() {
    /**
     * The default width of a drop div (simulates the border growing to accept
     * the drop)
     * @memberof View.QueryResults
     * @private
     * @constant
     */
    var dropWidth = 4;

    /**
     * Generator used to create a helper function to determine whether a div
     * should trigger the display of the join div or the sort div (i.e. is the
     * div dragged externally or internally from its parent table)
     * @param {jQuery} div A jQuery object wrapping a div
     * @returns {Function} A function that tests whether or not an element is a
     * child of the supplied div
     * @memberof View.QueryResults
     * @private
     */
    var excludeJoinFrom = function(div) {
      return function(el) {
        if(el[0].tagName != "TH") return false;
        var p1 = el.parentsUntil(div);
        return p1[p1.length-1].tagName == "HTML";
      };
    };

    /**
     * Generates a set of divs used to highlight when dropping a dragged column
     * will result in that column being joined to another in a different query
     * result table.
     * @param {jQuery} table A jQuery object wrapping a table that will be used
     * to generate the join divs.
     * @param {jQuery} joinDiv A jQuery object wrapping a div that will contain
     * the join divs.
     * @memberof View.QueryResults
     * @private
     */
    var computeJoinDivs = function(table, joinDiv) {
      joinDiv.empty();
      var varTH = table.find("tr.query-variables th");
      var tableTHPos = table.find("tr.query-header th").position();
      for(var i=0;i<varTH.length;i++) {
        var dropDiv = $("<div class='join-drop'>");
        dropDiv.appendTo(joinDiv);
        dropDiv.css("position","absolute");
        dropDiv.css("top",varTH.position().top-tableTHPos.top);
        dropDiv.css("left",$(varTH[i]).position().left-tableTHPos.left+1);
        dropDiv.css("height",table.height()-varTH.position().top);
        dropDiv.css("width",$(varTH[i]).width()+1);
      }
      joinDiv.find("div").droppable({
        hoverClass:"join-with", tolerance:"pointer", activeClass:"visible",
        greedy:true, accept: excludeJoinFrom(joinDiv.parent()),
        drop: function(e, ui) {
          var table1 = ui.draggable.parentsUntil("div.tables", "table");
          var name1 = table1.find("tr.query-header th").text();
          var table2 = $(e.target).parentsUntil("div.tables", "div.group")
            .find("table");
          var name2 = table2.find("tr.query-header th").text();
          var var1 = ui.draggable.text();
          var drop = $(e.target);
          var i = drop.parent().children().index(drop);
          var var2 = table2.find("tr.query-variables th").eq(i).text();
          var query1 = {"query": table2.attr("queryId"), "variable": var2};
          var query2 = {"query": table1.attr("queryId"), "variable": var1};
          console.log("Joining '"+name2+"'."+var2+" to '"+name1+"'."+var1);
          App.QueryCanvas.join(query1, query2);
        }
      });
    };

    /**
     * Generates a div containing the necessary divs to visualize where a drop
     * will cause columns to be reordered.
     * @param {jQuery} table A jQuery object wrapping the results table
     * @param {jQuery} sortDiv A jQuery object wrapping a div to populate with
     * the sort divs.
     * @memberof View.QueryList
     * @private
     */
    var computeSortDivs = function(table, sortDiv) {
      sortDiv.empty();
      var varTH = table.find("tr.query-variables th");
      var tableTHPos = table.find("tr.query-header th").position();
      for(var i=0;i<=varTH.length;i++) {
        var dropDiv = $("<div class='drop'>");
        dropDiv.appendTo(sortDiv);
        dropDiv.css("position","absolute");
        if(i == 0) {
          dropDiv.css("left",0);
        } else {
          dropDiv.css("left", 0.5 * $(varTH[i-1]).width() +
                      $(varTH[i-1]).position().left);
        }
        if(i == varTH.length) {
          dropDiv.css("right",0);
        } else if(i == 0) {
          dropDiv.css("width",$(varTH[i]).width()*0.5+
                      parseInt($(varTH[i]).css("padding")));
        } else {
          dropDiv.css("width",0.5*($(varTH[i]).width()+$(varTH[i-1]).width())+
                      parseInt($(varTH[i-1]).css("padding"))*2+
                      parseInt($(varTH[i-1]).css("border-width")));
        }
        dropDiv.css("top",varTH.position().top-tableTHPos.top);
        dropDiv.css("height", table.height() -
                    (varTH.position().top - tableTHPos.top));
        var childDiv = $("<div>");
        childDiv.css({"background-color":"#55f","top":0,"height":"100%",
                      "position":"absolute"});
        if( i == 0 ) {
          childDiv.css({"left":0,"width":dropWidth});
        } else if ( i == varTH.length ) {
          childDiv.css({"right":0,"width":dropWidth});
        } else {
          var cell = $(varTH[i-1]);
          childDiv.css({"left":
                        cell.position().left - tableTHPos.left +
                        cell.width() + 2*parseInt(cell.css("padding")) +
                        (-dropWidth/2) - parseInt(dropDiv.css("left")),
                        "width":dropWidth+1});
        }
        childDiv.appendTo(dropDiv);
      }
      sortDiv.children().droppable(
        {"hoverClass":"reorder-hover",
         "accept": "th",
         "tolerance":"pointer",
         "drop":function(event, ui) {
           var th = ui.draggable;
           var index = th.parent().children().index(th);
           var dropIndex = $(event.target).parent().children()
             .index(event.target);
           var append = th.parent().children().length == dropIndex;
           if(dropIndex == index || dropIndex == index + 1) {
             // dropped at same location; the table shouldn't change
             return;
           }
           if(dropIndex > index) dropIndex++;
           var cells = [th];
           var trs = th.parent().parent().children();
           for(var i=2;i<trs.length;i++) {
             var cell = trs.eq(i).children().eq(index)
             cells.push(cell);
           }
           if(append) {
             for(var i=1;i<trs.length;i++) {
               cells[i-1].appendTo(trs.eq(i));
             }
           } else {
             if(index < dropIndex) dropIndex--;
             for(var i=1;i<trs.length;i++) {
               cells[i-1].insertBefore(trs.eq(i).children().eq(dropIndex));
             }
           }
           var variables = th.parent().find("th").map(function(i, el) { return $(el).text(); });
           var group = th.parents("div.group");
           var table = group.find("table");
           App.QueryCanvas.reorderProjections(table.attr("queryId"), variables);
           computeSortDivs(table, group.find(".sort"));
           computeJoinDivs(table, group.find(".join"));
         }});
    };

    /**
     * Generates a table for the given query and result set.
     * @param {Query} queryInfo
     * @param {object} data JSON object containing results in the
     * application/sparql-results+json format.
     * @returns {jQuery} A div element containing the table and
     * supporting HTML elements (e.g. drag helpers, etc.)
     * @memberof View.QueryList
     * @private
     */
    var generateTable = function(queryInfo, data) {
      var head = data.head;
      var results = data.results;
      var table = $("<table>");
      table.append("<tbody>");
      table = table.find("tbody");
      var tr = $("<tr>");
      tr.addClass("query-header");
      tr.appendTo(table);
      var queryName = $("<th>");
      queryName.attr("colspan",head.vars.length);
      queryName.text(queryInfo.label);
      queryName.attr("comment",queryInfo.comment);
      queryName.appendTo(tr);
      tr = $("<tr>");
      tr.addClass("query-variables");
      tr.appendTo(table);
      var lookup = {};
      $.each(head.vars, function(i, name) {
        lookup[name] = i;
        var th = $("<th>");
        th.text(name);
        th.appendTo(tr);
      });
      $.each(results.bindings, function(i, binding) {
        tr = $("<tr>");
        tr.appendTo(table);
        var col = 0;
        $.each(binding, function(key, value) {
          if( col > lookup[key] ) {
            throw "Unexpected unordered columns in SPARQL results";
          }
          while( col < lookup[key] ) col++;
          var td = $("<td>");
          td.appendTo( tr );
          if( value.type=="uri" ) {
            td.html( '&lt;<a href="'+value.value+'" target="_new">' +
                     value.value + '</a>&gt;');
          } else if( value.type=="literal" ) {
            if( value.datatype == undefined &&
                value["xml:lang"] == undefined ) {
              td.text( '"' + value.value + '"');
            } else if( value.datatype == XSD.Decimal ||
                       value.datatype == XSD.Integer ||
                       value.datatype == XSD.Int ||
                       value.datatype == XSD.Short ||
                       value.datatype == XSD.Float ||
                       value.datatype == XSD.Double ) {
              td.text( value.value );
            } else if( value.datatype != undefined ) {
              td.text( '"' + value.value + '"^^<' + value.datatype + '>' );
            } else if( value["xml:lang"] != undefined ) {
              td.text( '"' + value.value + '"@' + value["xml:lang"] );
            } else {
              // should be covered by first if(); being conservative
              td.text( '"' + value.value + '"' );
            }
          } else {
            td.text( value.value );
          }
          col++;
        });
      });
      return table.parent();
    };

    /**
     * Options passed to $.sortable to enable query tables to be reordered
     * @memberof View.QueryList
     * @private
     */
    var sortOpts = {items:"> div",placeholder:"ui-sortable-placeholder",
                    handle:"tr.query-header th",axis:"x",
                    forcePlaceholderSize: true,
                    zIndex:1000,distance:5,tolerance:"pointer"};

    /**
     * Generates a drag helper to represent a column during a drag operation.
     * @param {jQuery.Event} el A jQuery Event representing the drag start event
     * @returns {jQuery} A DOM element wrapped in a jQuery object used by
     * jQuery UI to represent the drag.
     * @memberof View.QueryList
     * @private
     */
    var columnDragHelper = function(el) {
      el = $(el.srcElement);
      var table = el.parentsUntil(".grouper", "table");
      var thPos = table.find("tr.query-header th").position();
      var drag = $("<div class='draggable'>");
      drag.css("margin-top", "6pt");
      drag.css("background-color", "#000");
      drag.css("zIndex", 1000000);
      drag.css("opacity", 0.2);
      drag.css("top", el.position().top - thPos.top);
      drag.css("left", el.position().left - thPos.left);
      drag.css("width", parseInt(el.css("width")) +
               2 * parseInt(el.css("padding")));
      drag.css("height", table.height() - el.position().top +
               table.find("tr").length + 2);
      return drag;
    };

    /**
     * Helper function to configure CSS when a column drag operation begins.
     * @param {jQuery.Event} e A jQuery event object representing a mouse event
     * @param {object} ui A jQuery UI object
     * @memberof View.QueryList
     * @private
     */
    var columnDragStart = function(e, ui) {
      var el = $(e.srcElement);
      ui.helper.css("left", el.position().left -
                    el.position().left);
      $("#results-tabular div.drop-helper")
        .addClass("external-drop-target");
      el.parentsUntil("div.tables","div.group")
        .find(".drop-helper")
        .removeClass("external-drop-target")
        .addClass("internal-drop-target");
    };

    /**
     * Helper function to update CSS when a dragging operation for a column
     * is stopped.
     * @param {jQuery.Event} e A jQuery event object representing a mouse event
     * @param {object} ui A jQuery UI object
     * @memberof View.QueryList
     * @private
     */
    var columnDragStop = function(e, ui) {
      $("#results-tabular div.drop-helper")
        .removeClass("external-drop-target")
        .removeClass("internal-drop-target");
    };
    return {
      /**
       * Initializes the QueryList view, sets up the left-hand tabs for selecting
       * a query results view, and registers event listeners for a number of
       * query-related events.
       * @memberof View.QueryList
       */
      init: function() {
        $("#query-results .tabs-left").tabs({active:1})
          .addClass("ui-tabs-vertical ui-helper-clearfix");
        $("#query-results .tabs-left > ul li").removeClass("ui-corner-top");
        $("#query-results .tabs-left ul").removeClass("ui-corner-all");
        $("#query-results .tabs-left").removeClass("ui-corner-all");
        $("#query-results .tabs-left > ul").tooltip({show:{delay:1500},
                                                     items:"a"});
        $(window).bind("dropped_query", function(event, queryId) {
          View.QueryResults.addQueryResults( queryId );
        });
        $(window).bind("removed_query", function(event, queryId) {
          View.QueryResults.removeQueryResults( queryId );
        });
        $(window).bind("updated_query", function(event, oldId, newId) {
          if ( newId != undefined && oldId != newId ) {
            View.QueryResults.removeQueryResults( oldId );
            View.QueryResults.addQueryResults( newId );
          } else {
            // TODO some update mechanism here...
          }
        });
      },
      /**
       * Adds a new table to the set of query results for the query
       * identified by the given queryId.
       * @param {string} queryId A queryId returned by
       * {@link App.QueryCanvas.instantiate}
       * @memberof View.QueryResults
       */
      addQueryResults: function(queryId) {
        $("#query-results .spinner").css("display","block");
        var queryInfo = App.QueryCanvas.getQuery(queryId);
        var endpoint = queryInfo.endpoint;
        var graph = null;
        queries.graph(endpoint, function(success, g) {
          graph = g;
        });
        var sparql = queryInfo.toString({limit: 25});
        $.ajax(endpoint,
               {"data":{"output":"json","query":sparql},
                "ajax":true,
                "accepts":{"json":"application/sparql-results+json"},
                "success":function(data, status, jqxhr) {
                  var grouperDiv = $("<div class='group'>");
                  grouperDiv.appendTo("#results-tabular div.tables");
                  var table = generateTable(queryInfo, data);
                  table.attr("queryId", queryId);
                  table.appendTo(grouperDiv);
                  grouperDiv.parent().sortable(sortOpts);
                  var pos = table.position();
                  var div = $("<div class='drop-helper'>");
                  div.css({position:"absolute",top:pos.top,left:pos.left,
                           margin:"6pt",height:table.css("height"),
                           width:table.css("width")})
                    .appendTo(grouperDiv);
                  var sortDiv = $("<div class='sort'>").appendTo(div);
                  computeSortDivs(table, sortDiv);
                  var joinDiv = $("<div class='join'>").appendTo(div);
                  computeJoinDivs(table, joinDiv);
                  table.find("tr.query-variables th").draggable({
                    scroll:true, scrollSpeed: 20, scrollSensitivity: 100,
                    axis:"x", refreshPositions:true,
                    appendTo: $("#query-results div.tables"),
                    helper: columnDragHelper, start: columnDragStart,
                    stop: columnDragStop});
                  div.find("div.drop");
                },
                "error":function(jqxhr, status, error) {
                }}).always(function() {
                  $("#query-results .spinner").css("display","none");
                });
      },
      /**
       * Removes a query results table from the results view.
       * @param {string} queryId A queryId returned by
       * {@link App.QueryCanvas.instantiate}
       * @memberof View.QueryResults
       */
      removeQueryResults: function(queryId) {
        var table = $("div.tables table[queryId='"+queryId+"']");
        table.parent().css("display", "none");
        window.setTimeout(function() { table.parent().remove(); }, 100);
      }
    };
  })(),
  /**
   * Shows an error dialog
   * @param {string} error An error string
   * @memberof View
   */
  showError: function(error) {
    $("#error-dialog p").text(error);
    $("#error-dialog").dialog("open");
  },
  /**
   * Initializes the application views.
   * @memberof View
   */
  init: function() {
    View.Endpoints.init();
    View.QueryList.init();
    View.Canvas.init();
    View.QueryResults.init();
    $("#error-dialog").dialog(
      {"modal":true,"resizable":false,"draggable":false,
       "autoOpen": false, "title":"Error","buttons":[
         {text:"Dismiss",click:function() { $(this).dialog( "close" );}}]});
  }
};
