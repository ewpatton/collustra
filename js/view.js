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
                var endpoint = new Endpoint(newUri);
                endpoint.label = newLabel;
                endpoint.comment = newComment;
                App.Endpoints.addEndpoint( endpoint );
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
        $("#endpoints select").change(function() {
          View.ConceptList.refresh();
          View.QueryList.refresh();
        });
        $("#endpoints #add-endpoint").click(function(e) {
          e.preventDefault();
          View.Endpoints.showDialogForEndpoint()
            .then(View.Endpoints.refresh);
        });
        $("#endpoints #edit-endpoint").click(function(e) {
          e.preventDefault();
          var active = $("#endpoints select").val();
          if ( active === "" || active === "No Endpoint" ) {
            // no endpoints; we shouldn't get here but just in case
            return;
          }
          var endpoint = App.Endpoints.getEndpoint( active );
          if ( endpoint != null ) {
            View.Endpoints.showDialogForEndpoint( endpoint )
              .then(View.Endpoints.refresh);
          }
        });
        $("#endpoints #remove-endpoint").click(function(e) {
          e.preventDefault();
          var active = $("#endpoints select").val();
          if ( active === "" || active === "No Endpoint" ) {
            // no endpoints; we shouldn't get here but just in case
            return;
          }
          App.Endpoints.removeEndpoint( active );
          View.Endpoints.refresh();
        });
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
        $("#endpoints").trigger("rendered");
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
    var dragOpts ={"appendTo":"body","helper":helper,"start":doSelect,
                   "revert":"invalid"};
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
            li.attr("type","query");
            li.text(queries[uri].label);
            if(queries[uri]["comment"] != undefined) {
              li.attr("comment", queries[uri].comment);
            }
            li.appendTo(ul);
            li.draggable(dragOpts);
          }
        }
        $("#query-list").trigger("rendered");
      }
    };
    // end QueryList
  })(),
  /**
   * @class
   * @classdesc
   * The ConceptList view provides draggable elements representing classes
   * declared in one or more dropped endpoints that can be used to instantiate
   * queries for instances of the class named by the draggable.
   * @memberof View
   */
  ConceptList: (function() {
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
      if ( $(this).hasClass("ui-selected") ) {
        $(this).removeClass("ui-selected");
      }
    }

    /**
     * Options passed to $.draggable in the query list
     * @memberof View.QueryList
     * @private
     */
    var dragOpts ={"appendTo":"body","helper":helper,"start":doSelect,
                   "revert":"invalid"};

    return {
      init: function() {
        $(window).bind("new_endpoint", function(event, uri) {
          App.ConceptList.loadConceptsFromEndpoint( uri )
            .then(View.ConceptList.refresh, View.showError);
        });
      },
      refresh: function() {
        var endpoint = $( "#endpoints select" ).val();
        endpoint = App.Endpoints.getEndpoint( endpoint );
        var concepts = App.ConceptList.getConceptsFromEndpoint( endpoint );
        var sorted = [];
        for(var uri in concepts) {
          if ( concepts.hasOwnProperty( uri ) ) {
            sorted.push(concepts[uri])
          }
        }
        sorted.sort(function(a, b) {
          return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
        });
        var ul = $("#query-list #concepts ul");
        ul.empty();
        $.map(sorted, function(concept) {
          var li = ul.find("li[uri='"+concept.uri+"']");
          if(li.length == 0) {
            li = $("<li>");
            li.addClass("query-item ui-widget-content");
            li.attr("uri", concept.uri);
            li.attr("type","concept");
            var curie = PrefixHelper.curieObject(concept.uri);
            var label = concept.label;
            if ( curie.prefix !== null ) {
              label += " ("+curie.prefix+")";
            }
            li.text(label);
            if(concept["comment"] !== undefined) {
              li.attr("comment", concept.comment);
            }
            li.appendTo(ul);
            li.draggable(dragOpts);
          }
        });
        $("#concepts").trigger("rendered");
      }
    };
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
    var isDropping = false;

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

    var settingsAction = function(e) {
      var queryId = $(e.target).parents("div.gear-menu").parent()
        .find(".vars").attr("queryid");
      View.QueryDetails.show( queryId, "General" );
    }

    var parameterizeAction = function(e) {
      var queryId = $(e.target).parents("div.gear-menu").parent()
        .find(".vars").attr("queryid");
      View.QueryDetails.show( queryId, "Parameters" );
    }

    var streamAction = function(e) {
      var queryId = $(e.target).parents("div.gear-menu").parent()
        .find(".vars").attr("queryId");
      View.QueryDetails.show( queryId, "Streaming" );
    }

    var collapseAction = function(e) {}
    var deleteAction = function(e) {}

    var addMenu = function(div) {
      var menu = $("<div>");
      // fix for dirty buffer issue in WebKit
      menu.appendTo(div).addClass("gear-menu").mouseout(function() {
        $("#canvas").hide().show(0);
      });
      var gear = $("<div>");
      gear.appendTo(menu).addClass("gear");
      $("<img>").attr("src", "images/gear.svg").attr("alt", "Query Settings")
        .attr("width","16pt").click(settingsAction).appendTo(gear);
      gear = $("<div>");
      gear.addClass("menu").appendTo(menu);
      var ul = $("<ul>");
      ul.appendTo(gear);
      $("<li>").text("Parameterize Query...").click(parameterizeAction)
        .appendTo(ul);
      $("<li>").text("Streaming...").click(streamAction).appendTo(ul);
      $("<li>").text("Collapse Query").click(collapseAction).appendTo(ul);
      $("<li>").text("Delete Query").click(deleteAction).appendTo(ul);
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
      isDropping = true;
      var self = $(this);
      var query = ui.helper.clone().appendTo(self)
        .draggable({"containment":"parent", "handle":"span"}).addClass("query")
        .removeClass("drag-query ui-draggable-dragging");
      addMenu(query);
      query.position(ui.position);
      query.disableSelection();
      var div = $("<div>");
      query.append(div);
      div.addClass("vars");
      var uri = ui.draggable.attr("uri");
      var queryInfo = App.QueryList.getQueries()[uri] ||
        App.ConceptList.getConceptQuery(uri);
      $.map(queryInfo.projections,
            function(value) {
              var span = $("<div>");
              div.append(span);
              span.attr("varName", value["varName"]);
              span.text(value["varName"]);
              span.tooltip({"show":{delay:"1000"},"items":"*",
                            "content":value["comment"]});
              span.click(View.Canvas.showLinkages);
            });
      var queryId = App.QueryCanvas.instantiate(uri,
                                                $("#endpoints select").val());
      div.attr("queryId", queryId);
      $(window).trigger("dropped_query", [queryId]);
      isDropping = false;
    };

    var makeQueryPane = function( queryId ) {
      var query = App.QueryCanvas.getQuery( queryId );
      var div = $( "<div>" ).addClass( "query" ).css( "left", 100 )
        .css( "top", 100 ).css( "position", "absolute" ).disableSelection()
        .draggable({"containment":"parent", "handle":"span"});
      $( "<span>" ).text( query.label ).appendTo( div );
      addMenu(div);
      $( "<div>" ).addClass( "vars" ).attr( "queryid", queryId )
        .appendTo( div );
      return div;
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
        $("#query-input-dialog").dialog({
          "autoOpen": false,
          "width": 780,
          "buttons": [
            {text:"Cancel",
             click:function(){
               $("#query-input-dialog").dialog("close");
             }},
            {text:"OK",
             click:function() {
               $("#query-input-dialog").dialog("close");
               App.QueryCanvas.parseQuery($("#query-input-dialog textarea").val());
             }}
          ]
        });
        $("#query-input-dialog textarea").bind('paste', function(e) {
          window.setTimeout(function() {
            var alltext = $("#query-input-dialog textarea").val();
            var stopIndex = alltext.indexOf("PREFIX");
            var commenttext = alltext.substr(0, stopIndex);
            var comment = /^(#[^#]+)/;
            var endComment = /^(#[^P]+)PREFIX/;
            var matched = null;
            var formatted = "";
            while ( matched = commenttext.match( comment ) ) {
              formatted += matched[1] + "\n";
              commenttext = commenttext.substr(matched[1].length);
            }
            formatted += commenttext + "\n";
            formatted += alltext.substr(stopIndex);
            $("#query-input-dialog textarea").val(formatted);
          }, 100);
        });
        $("#canvas .add-button").click(function() {
          $("#query-input-dialog textarea").text("");
          $("#query-input-dialog").dialog("open");
        });
        $(window).bind("projection_added", function(e, queryId, variable) {
          var div = $("div[queryId='"+queryId+"']");
          var proj = $("<div>");
          div.append(proj);
          proj.attr("varName", variable.varName);
          proj.text(variable.varName);
          if ( variable.comment !== undefined ) {
            proj.tooltip({"show":{delay:"1000"},"items":"*",
                          "content":variable.comment});
          }
          proj.click(View.Canvas.showLinkages);
        });
        $(window).bind("projection_removed", function(e, queryId, variable) {
          $("div[queryId='"+queryId+"'] div[varName='"+variable.varName+"']")
            .remove();
        });
        $(window).bind("instantiated_query", function(e, queryId) {
          if ( isDropping ) return;
          var query = App.QueryCanvas.getQuery( queryId );
          var div = makeQueryPane( queryId );
          div.appendTo( "#canvas" );
          div = div.find(".vars");
          $.map(query.projections,
                function(value) {
                  $("<div>").attr("varName", value["varName"])
                    .text(value["varName"])
                    .tooltip({"show":{delay:"1000"},"items":"*",
                              "content":value["comment"]})
                    .click(View.Canvas.showLinkages)
                    .appendTo(div);
                });
        });
        $(window).bind("updated_query", function(e, oldId, newId) {
          var div = $("div[queryId='"+oldId+"']");
          div.find("ul").remove();
          if ( newId !== undefined && newId !== oldId ) {
            div.attr("queryId", newId);
            // TODO other stuff here, e.g. update projections
            div.empty();
            var queryInfo = App.QueryCanvas.getQuery(newId);
            $.map(queryInfo.projections,
                  function(value) {
                    var span = $("<div>");
                    div.append(span);
                    span.attr("varName", value["varName"]);
                    span.text(value["varName"]);
                    span.tooltip({"show":{delay:"1000"},"items":"*",
                                  "content":value["comment"]});
                    span.click(View.Canvas.showLinkages);
                  });
          }
        });
        $(window).bind("removed_query", function(e, oldId) {
          var div = $("div[queryId='"+oldId+"']").parent();
          div.remove();
        });
      },
      showLinkages: function(event) {
        var el = $(event.target);
        var queryId = el.parent().attr("queryId");
        var query = App.QueryCanvas.getQuery(queryId);
        var variable = query.getVariable( el.contents()[0].nodeValue );
        var endpoint = query.getActiveEndpoint();
        if ( typeof endpoint === "string" ) {
          endpoint = App.Endpoints.getEndpoint(endpoint);
        }
        App.QueryCache
          .getQueryTemplateFromURI("queries/describe-properties.rqt")
          .then(function(uri, template) {
            var substitution = {"VARIABLE": variable};
            template = query.applyToTemplate(template, substitution);
            return endpoint.query(template);
          })
          .done(function(data) {
            var ul = $("<ul>");
            ul.appendTo(el);
            var bindings = data.results.bindings;
            if ( bindings.length === 0 ||
                 bindings[0].Property === undefined ) {
              var li = $("<li>");
              li.appendTo(ul);
              li.html("<em>No properties found</em>");
            } else {
              $.map(bindings, function(binding) {
                var uri = binding.Property.value;
                var label = binding.Label === undefined ?
                  labelFromUri(uri) : binding.Label.value;
                var comment = binding.Comment === undefined ?
                  "" : binding.Comment.value;
                var occurrences = binding.Occurrences.value;
                var li = $("<li>");
                li.attr("uri", uri);
                li.attr("label", label);
                var curie = PrefixHelper.curieObject(uri);
                if ( curie.prefix !== null ) {
                  label = label + " (" + curie.prefix + ")";
                }
                label += " [" + occurrences + "]";
                li.text(label);
                if ( comment !== "" ) {
                  li.attr("comment", comment);
                }
                li.appendTo(ul);
              });
              ul.find("li").click(function(event2) {
                event2.stopImmediatePropagation();
                var li = $(event2.target);
                var uri = li.attr("uri");
                console.log(uri);
                var label = li.attr("label");
                if ( label.indexOf("Has ") === 0 ) {
                  label = label.replace("Has ","");
                } else if ( label.indexOf("Is ") === 0 ) {
                  label = label.replace("Is ", "");
                }
                label = label.replace(/ /g, "_");
                label = label.toLowerCase();
                console.log(label);
                var newVar = App.QueryCanvas.addVariable(queryId, label);
                App.QueryCanvas.project(queryId, newVar);
                App.QueryCanvas.addWhereClause(queryId, variable, uri, newVar);
                return false;
              });
            }
          })
          .fail(View.showError);
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
        if(el[0].tagName !== "TH") return false;
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
           var variables = th.parent().find("th").map(function(i, el) {
             return $(el).text();
           });
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
      $.map(results.bindings, function(binding) {
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
          if( value.type === "uri" ) {
            td.html( '&lt;<a href="' + value.value + '" target="_new">' +
                     value.value + '</a>&gt;');
          } else if( value.type === "literal" ) {
            if( value.datatype === undefined &&
                value["xml:lang"] === undefined ) {
              td.text( '"' + value.value + '"');
            } else if( value.datatype === XSD.Decimal ||
                       value.datatype === XSD.Integer ||
                       value.datatype === XSD.Int ||
                       value.datatype === XSD.Short ||
                       value.datatype === XSD.Float ||
                       value.datatype === XSD.Double ) {
              td.text( value.value );
            } else if( value.datatype !== undefined ) {
              td.text( '"' + value.value + '"^^<' + value.datatype + '>' );
            } else if( value["xml:lang"] !== undefined ) {
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
          $("pre[queryId='"+queryId+"']").remove();
        });
        $(window).bind("updated_query", function(event, oldId, newId) {
          if ( newId !== undefined && oldId !== newId ) {
            View.QueryResults.removeQueryResults( oldId );
            View.QueryResults.addQueryResults( newId );
            var queryInfo = App.QueryCanvas.getQuery(newId);
            var p = $("pre[queryId='"+oldId+"']");
            p.text(queryInfo.toString());
            p.attr("queryId", newId);
          } else {
            // TODO some update mechanism here...
            // suboptimal workaround
            View.QueryResults.removeQueryResults( oldId );
            View.QueryResults.addQueryResults( oldId );
            var queryInfo = App.QueryCanvas.getQuery(oldId);
            $("pre[queryId='"+oldId+"']")
              .text(queryInfo.toString());
          }
        });
        $(window).bind("instantiated_query", function(e, queryId) {
          var queryInfo = App.QueryCanvas.getQuery(queryId);
          if ( $( "#canvas " ) ) {
          }
          var div = $("#results-raw-sparql")
          var p = $("<pre>");
          p.text(queryInfo.toString());
          p.attr("queryId", queryId);
          div.append(p);
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
        var endpoint = queryInfo.getActiveEndpoint().uri;
        var graph = null;
        queries.graph(endpoint, function(success, g) {
          graph = g;
        });
        var sparql = queryInfo.toString({limit: 25});
        $.ajax(endpoint,
               {"data":{"output":"json","query":sparql},
                "ajax":true,
                "headers":{"Accept":"application/sparql-results+json"},
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
                    axis:"x", refreshPositions:true, distance: 10,
                    appendTo: $("#query-results div.tables"),
                    helper: columnDragHelper, start: columnDragStart,
                    stop: columnDragStop});
                  div.find("div.drop");
                  $("#query-results").trigger("rendered");
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
        window.setTimeout(function() {
          table.parent().remove();
          $("#query-results").trigger("rendered");
        }, 100);
      },
      doBindVariable: function(event, data) {
        console.log(arguments);
        var queryId = data.$trigger.parents("[queryId]").attr("queryId");
        var queryInfo = App.QueryCanvas.getQuery(queryId);
        var var_name = data.$trigger.text();
        var variable = queryInfo.getVariable(var_name);
        var dialog = $( "#bind-variable-dialog" );
        dialog.attr( "queryId", queryId );
        dialog.attr( "varName", var_name );
        dialog.find( "select" ).empty();
        dialog.dialog( "open" );
        App.QueryCache.getQueryTemplateFromURI("queries/describe-objects.rqt")
          .then(function(uri, template) {
            var queryText = queryInfo.applyToTemplate(template,
                                                      {"VARIABLE": variable});
            var endpoint = queryInfo.getActiveEndpoint();
            return endpoint.query(queryText);
          })
          .done(function(data) {
            //var select = $( "#bind-variable-dialog select" );
            var select = $( "<select>" );
            $.map(data.results.bindings, function(binding) {
              var value = binding[var_name].value;
              var isUri = binding[var_name].type === "uri";
              var datatype = !isUri ? binding[var_name].datatype : null;
              var lang = !isUri ? binding[var_name]["xml:lang"] : null;
              var label = isUri ? value : binding.Label !== undefined ?
                binding.Label.value : labelFromUri( value );
              $("<option>").val(value).text(label).attr( "datatype", datatype )
                .attr( "uri", isUri ).attr( "lang", lang ).appendTo( select );
            });
            $( "#bind-variable-dialog select" ).replaceWith( select );
          })
          .fail(function() {
            $( "#bind-variable-dialog" ).dialog( "close" );
            console.log(arguments);
          });
      },
      // TODO MVC breaking down here. refactor when possible.
      finishBindVariable: function() {
        var dialog = $( this );
        dialog.dialog( "close" );
        var queryId = dialog.attr( "queryId" );
        var var_name = dialog.attr( "varName" );
        dialog.attr( "queryId", null );
        dialog.attr( "varName", null );
        var value = dialog.find( "select" ).val();
        var option = dialog.find( "select :selected" );
        var isUri = option.attr("uri") === "true";
        var datatype = option.attr("datatype");
        var lang = option.attr("lang");
        if ( isUri ) {
          value = new Query.Resource( value );
        } else {
          value = new Query.Literal( value, datatype, lang );
        }
        App.QueryCanvas.substitute( queryId, var_name, value );
      },
      cancelBindVariable: function() {
        $( "#bind-variable-dialog" ).dialog( "close" );
      }
    };
  })(),
  /**
   *
   */
  QueryDetails: (function() {
    var textBlurCallback = function(queryId, varName, param) {
      return function(e) {
        var opts = {}, val = $(e.target).val();
        opts[param] = val == '' ? null : val;
        App.QueryCanvas.parameterize( queryId, varName, opts);
        return true;
      };
    };
    var selectChangeCallback = function(queryId, varName, param) {
      return function(e) {
        var opts = {}, val = $(e.target).val();
        opts[param] = val == 'unspecified' ? null : val;
        App.QueryCanvas.parameterize( queryId, varName, opts);
        return true;
      };
    };
    var entryForParameter = function(queryId, varName) {
      var entry = App.QueryCanvas.getQuery(queryId).getVariable(varName);
      var param = $("<div>").addClass("parameter");
      var check = $("<input>").attr("type","checkbox");
      if ( entry instanceof Query.Parameter ) {
        check[0].checked = true;
        param.addClass("open");
      }
      check.click(function(e) {
        param.toggleClass("open");
        e.stopPropagation();
        if ( param.hasClass("open") ) {
          var params = new Query.Parameter.Options();
          params.type = "xsd:string";
          params.defaultValue = "";
          App.QueryCanvas.parameterize( queryId, varName, params );
        } else {
          App.QueryCanvas.unparameterize( queryId, varName );
        }
        return true;
      });
      var head = $("<div>").addClass("header").append(check)
        .click(function() { check.click(); return false; })
        .appendTo(param);
      var title = $("<span>").addClass("title").text(varName)
        .click(function() { check.click(); return false; })
        .disableSelection().appendTo(head);
      var opts = $("<div>").addClass("options").appendTo(param);
      $("<span>Type:</span>").appendTo(opts);
      var defValue = null;
      if ( entry.type != undefined && entry.type == 'xsd:boolean' ) {
        defValue = $("<select>");
        defValue.append("<option value='unspecified'>unspecified</option>")
          .append("<option value='true'>true</option>")
          .append("<option value='false'>false</option>")
          .change(selectChangeCallback(queryId, varName, "defaultValue"));
        defValue.val(entry.defValue != null ? entry.defValue : 'unspecified');
      } else {
        defValue = $("<input>");
      }
      var types = $("<select>").appendTo(opts)
        .append("<option value='xsd:string'>Text</option>")
        .append("<option value='xsd:decimal'>Decimal</option>")
        .append("<option value='xsd:integer'>Integer</option>")
        .append("<option value='xsd:boolean'>Boolean</option>")
        .append("<option value='uri'>URI</option>")
        .change(function() {
          var val = types.find("option:selected").val();
          if ( val == "xsd:boolean" ) {
            if ( defValue[0].nodeName != "SELECT" ) {
              var temp = $("<select>");
              defValue.replaceWith(temp);
              defValue = temp;
              defValue.append("<option value='unspecified'>unspecified</option>")
                .append("<option value='true'>true</option>")
                .append("<option value='false'>false</option>")
                .change(selectChangeCallback(queryId, varName, "defaultValue"));
            }
          } else {
            if ( defValue[0].nodeName != "INPUT" ) {
              var temp = $("<input>").attr("type","text");
              defValue.replaceWith(temp);
              defValue = temp;
              defValue.blur(textBlurCallback(queryId, varName, "defaultValue"));
            }
          }
          App.QueryCanvas.parameterize( queryId, varName, { "type": val } );
        });
      if ( entry.type != null ) {
        types.val( entry.type );
      }
      opts.append("<span>Default:</span>");
      if ( entry.defaultValue != null ) {
        defValue.val( entry.defaultValue );
      }
      defValue.attr("type","text")
        .blur(textBlurCallback(queryId, varName, "defaultValue"))
        .appendTo(opts);
      opts.append("<span>Required:</span>");
      var required = $("<input>").attr("type","checkbox").appendTo(opts);
      required.click(function(e) {
        App.QueryCanvas.parameterize( queryId, varName,
                                      { "required": e.target.checked });
      });
      if ( entry.required ) {
        required[0].checked = entry.required;
      }
      opts.append("<br>");
      opts.append("<span>Documentation:</span>");
      var docs = $("<input>").attr("type","text")
        .blur(textBlurCallback(queryId, varName, "documentation")).appendTo(opts);
      if ( entry.documentation !== undefined ) {
        docs.val( entry.documentation );
      }
      return param;
    };
    var updateForQuery = function( queryId ) {
      var plist = $("#parameter-list");
      plist.empty();
      var query = App.QueryCanvas.getQuery( queryId );
      $("#query-name").val(query.label)
        .blur(function() {
          query.label = $("#query-name").val();
        });
      /* TODO: breaking MVC abstraction here. Add a method to iterate over
         variable names given a queryId */
      for ( var varName in query.variables ) {
        if ( query.variables.hasOwnProperty( varName ) ) {
          plist.append( entryForParameter( queryId, varName ) );
        }
      }
    };
    return {
      init: function() {
        $("#detail-dialog").dialog({
          'autoOpen': false,
          'draggable': true,
          'modal': true,
          'minWidth': 700,
          'minHeight': 300,
          'title': 'Query Settings'
        });
        $("#detail-dialog .content").tabs().addClass("ui-tabs-vertical ui-helper-clearfix");
        $("#detail-dialog .content li").removeClass("ui-corner-top");
      },
      show: function( queryId, tab ) {
        var dialog = $("#detail-dialog");
        dialog.dialog( 'open' );
        if ( tab !== undefined ) {
          var index = $("#detail-dialog").find(".content>ul>li:contains('"+tab+"')").focus().index();
          dialog.find(".content").tabs("option", "active", index);
          updateForQuery( queryId );
        }
      },
      close: function() {
        $( '#detail-dialog' ).dialog( 'close' );
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
    // have jQuery propogate the dataTransfer object from the browser's event
    jQuery.event.props.push('dataTransfer');

    // lay out the UI
    var rightPrefix = "listing-ui-layout-";
    var rightOpts = {
      closeable: true,
      resizable: true,
      slidable: true,
      livePaneResizing: true,
      north__minSize: "50",
      north__size: "50",
      south__minSize: "200",
      south__size: "300",
      center__minHeight: 500,
      center__showOverflowOnHover: true
    };
    var leftOpts = $.extend({}, rightOpts);
    leftOpts.center__showOverflowOnHover = false;
    var rightLayout,leftLayout;

    var layout = $("body").layout({east__size:"250",east__onresize:function() {
      console.log("East");
      rightLayout.resizeAll();
    },center__onresize:function() {
      console.log("center");
      leftLayout.resizeAll();
    }});
    leftLayout = $("#left-pane").layout(leftOpts);
    rightLayout = $(".ui-layout-east").layout(rightOpts);

    // enable the context menus
    $.contextMenu({"selector":"div.query span",
                   "items":{remove:{name:"Remove Query",
                                    callback:function(event, data) {
                                      data.$trigger.parent().remove();
                                    }}}});
    $.contextMenu({"selector":"tr.query-variables th",
                   "items":{
                     bind:{name:"Bind Variable",
                           callback:View.QueryResults.doBindVariable}}});

    View.Endpoints.init();
    View.QueryList.init();
    View.ConceptList.init();
    View.Canvas.init();
    View.QueryResults.init();
    View.QueryDetails.init();
    $("#error-dialog").dialog(
      {"modal":true,"resizable":false,"draggable":false,
       "autoOpen": false, "title":"Error","buttons":[
         {text:"Dismiss",click:function() { $(this).dialog( "close" );}}]});
    $("#bind-variable-dialog").dialog(
      {"modal": true, "resizable": false, "draggable": false,
       "autoOpen": false, "title": "Bind Variable", "buttons": [
         {text:"Cancel",click:View.QueryResults.cancelBindVariable},
         {text:"Save",click:View.QueryResults.finishBindVariable}
       ]});
  }
};

(function($) {
  $.fn.disableSelection = function() {
    return this.attr('unselectable','on')
      .css({'-moz-user-select':'-moz-none',
            '-moz-user-select':'none',
            '-o-user-select':'none',
            '-khtml-user-select':'none',
            '-webkit-user-select':'none',
            '-ms-user-select':'none',
            'user-select':'none'
           }).bind('selectstart',
                   function(){ return false; });
  };
})(jQuery);
