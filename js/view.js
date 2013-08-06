var View = {
  Endpoints: (function() {
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

    var configureEndpointDrop = function() {
      $("#endpoints").bind("dragover", function(event) {
        event.stopPropagation();
        return false;
      }).bind("drop", dropUrl);
    };

    var endpointDialogDeferred = null;
    var endpointDialogURI = null;
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
      init: function() {
        var opts = 
          {modal:true,draggable:false,resizable:false,
           width:600,title:"SPARQL Endpoint Options",
           autoOpen: false, buttons:
           [{text: "Cancel", click: function() {
             $( this ).dialog( "close" );
             if ( endpointDialogDeferred ) {
               endpointDialogDeferred.rejectWith( window, [ uri, "Cancelled by user." ] );
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
  QueryList: (function() {
    var helper = function() {
      var self = $(this);
      var elem = $("<div>");
      elem.append("<span>");
      elem.find("span").attr("comment",self.attr("comment")).text(self.text());
      return elem;
    };

    var doSelect = function(event, ui) {
      if ( $(this).hasClass("ui-selected") ) $(this).removeClass("ui-selected");
    }

    var dragOpts ={"helper":"clone","appendTo":"body","helper":helper,
                   "start":doSelect,"revert":"invalid"};
    return {
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
  })(),
  Canvas: (function() {
    var animateDragOver = function(event, ui) {
      ui.helper.addClass("drag-query", 200);
    }

    var animateDragOut = function(event, ui) {
      ui.helper.removeClass("drag-query", 200);
    }

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
               span.text(value["name"]);
               span.tooltip({"show":{delay:"1000"},"items":"*",
                             "content":value["comment"]});
             });
      var queryId = App.QueryCanvas.instantiate(uri);
      $(window).trigger("dropped_query", [$(ui.draggable)]);
    };

    return {
      init: function() {
        $("div#canvas").droppable({"accept":"li.query-item","activeClass":"drop-here",
                                   "hoverClass":"drop-now","drop":drop,
                                   "over":animateDragOver,"out":animateDragOut});
      }
    };
  })(),
  QueryResults: (function() {
    return {
      init: function() {
        $("#query-results .tabs-left").tabs({active:1}).addClass("ui-tabs-vertical ui-helper-clearfix");
        $("#query-results .tabs-left > ul li").removeClass("ui-corner-top");
        $("#query-results .tabs-left ul").removeClass("ui-corner-all");
        $("#query-results .tabs-left").removeClass("ui-corner-all");
        $("#query-results .tabs-left > ul").tooltip({"items":"a","show":{"delay":1500}});
        $(window).bind("dropped_query", function(event, dropped) {
          var uri = dropped.attr("uri");
          View.QueryResults.addQueryResults(uri);
        });
      },
      addQueryResults: function(uri) {
        $("#query-results .spinner").css("display","block");
        var queryInfo = App.QueryList.getQueries()[uri];
        var endpoint = queryInfo.endpoint;
        var graph = null;
        queries.graph(endpoint, function(success, g) {
          graph = g;
        });
        var sparql = SpinHelper.toSPARQL(queries, graph, uri, {"limit": 25});
        $.ajax(endpoint,
               {"data":{"output":"json","query":sparql},
                "ajax":true,
                "accepts":{"json":"application/sparql-results+json"},
                "success":function(data, status, jqxhr) {
                  var results = data.results;
                  var head = data.head;
                  var table = $("<table>");
                  var grouperDiv = $("<div>");
                  table.appendTo(grouperDiv);
                  grouperDiv.appendTo("#query-results #results-tabular div.tables");
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
                  grouperDiv.parent().sortable({items:"> div",placeholder:"ui-sortable-placeholder",
                                                handle:"tr.query-header th",axis:"x",
                                                forcePlaceholderSize: true,
                                                zIndex:1000,distance:5,tolerance:"pointer"});
                  var div = $("<div>");
                  div.appendTo(grouperDiv);
                  var sortDiv = $("<div class='sort'>");
                  sortDiv.appendTo(div);
                  var joinDiv = $("<div class='join'>");
                  joinDiv.appendTo(div);
                  var pos = table.parent().position();
                  div.css({"top":pos.top,"left":pos.left,"width":table.parent().css("width"),
                           "height":table.parent().css("height"),"display":"none","margin":"6pt",
                           "position":"absolute"});
                  var varTH = table.find("tr.query-variables th");
                  var tableTHPos = table.find("tr.query-header th").position();
                  var dropWidth = 4;
                  for(var i=0;i<=head.vars.length;i++) {
                    var dropDiv = $("<div class='drop'>");
                    dropDiv.css("position","absolute");
                    dropDiv.appendTo(sortDiv);
                    if(i == 0) {
                      dropDiv.css("left",0);
                    } else {
                      dropDiv.css("left",0.5*$(varTH[i-1]).width()+$(varTH[i-1]).position().left);
                    }
                    if(i == head.vars.length) {
                      dropDiv.css("right",0);
                    } else if(i == 0) {
                      dropDiv.css("width",$(varTH[i]).width()*0.5+parseInt($(varTH[i]).css("padding")));
                    } else {
                      dropDiv.css("width",0.5*($(varTH[i]).width()+$(varTH[i-1]).width())+
                                  parseInt($(varTH[i-1]).css("padding"))*2+
                                  parseInt($(varTH[i-1]).css("border-width")));
                    }
                    dropDiv.css("top",varTH.position().top-tableTHPos.top);
                    dropDiv.css("height",table.height()-(varTH.position().top-tableTHPos.top));
                    var childDiv = $("<div>");
                    childDiv.css({"background-color":"#55f","top":0,"height":"100%",
                                  "position":"absolute"});
                    if( i == 0 ) {
                      childDiv.css({"left":0,"width":dropWidth});
                    } else if ( i == head.vars.length ) {
                      childDiv.css({"right":0,"width":dropWidth});
                    } else {
                      childDiv.css({"left":(-dropWidth/2)+($(varTH[i-1]).position().left-tableTHPos.left+$(varTH[i-1]).width()+2*parseInt($(varTH[i-1]).css("padding")))-parseInt(dropDiv.css("left")),
                                    "width":dropWidth+1});
                    }
                    childDiv.appendTo(dropDiv);
                    if(i < head.vars.length) {
                      dropDiv = $("<div class='join-drop'>");
                      dropDiv.appendTo(joinDiv);
                      dropDiv.css("position","absolute");
                      dropDiv.css("top",varTH.position().top-tableTHPos.top);
                      dropDiv.css("left",$(varTH[i]).position().left-tableTHPos.left+1);
                      dropDiv.css("border",$(varTH[i]).css("padding")+" solid rgba(0,128,0,0.5)");
                      dropDiv.css("height",table.height()-varTH.position().top-parseInt($(varTH[i]).css("padding")));
                      dropDiv.css("width",$(varTH[i]).width()+1);
                    }
                  }
                  joinDiv.find("div").droppable({greedy:true,activeClass:"visible",
                                                 accept:function(el) {
                                                   if(el[0].tagName != "TH") return false;
                                                   var p1 = el.parentsUntil(div);
                                                   return p1[p1.length-1].tagName == "HTML";
                                                 }});
                  table.find("tr.query-variables th").draggable({
                    axis:"x",
                    appendTo: div,
                    helper:function(el) {
                      el = $(el.srcElement);
                      var tableTHPos = table.find("tr.query-header th").position();
                      div.css("display", "block");
                      var drag = $("<div class='draggable'>");
                      drag.css("background-color","#000");
                      drag.css("opacity",0.2);
                      drag.css("top",el.position().top - tableTHPos.top);
                      drag.css("left",el.position().left - tableTHPos.left);
                      drag.css("width",parseInt(el.css("width"))+2*parseInt(el.css("padding")));
                      drag.css("height",table.height()-el.position().top+table.find("tr").length+2);
                      return drag;
                    },start:function(e, ui) {
                      var el = $(e.srcElement);
                      ui.helper.css("left",el.position().left - tableTHPos.left);
                      el.parent().parent()
                    },stop:function(e, ui) {
                      div.css("display", "none");
                    }});
                  div.find("div.drop").droppable({"hoverClass":"reorder-hover",
                                                  "accept": "th",
                                                  "tolerance":"pointer",
                                                  "drop":function() {
                                                    div.css("display","none");
                                                  }});
                  console.log(table.parent().css("width"));
                },
                "error":function(jqxhr, status, error) {
                }}).always(function() {
                  $("#query-results .spinner").css("display","none");
                });
      }
    };
  })(),
  showError: function(error) {
    $("#error-dialog p").text(error);
    $("#error-dialog").dialog("open");
  },
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
