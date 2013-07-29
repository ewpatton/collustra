var store = new rdfstore.Store({name:"rdfstore"},function() {});

var doSelect = function(event, ui) {
  if ( $(this).hasClass("ui-selected") ) $(this).removeClass("ui-selected");
}

var helper = function() {
  var self = $(this);
  var elem = $("<div>");
  elem.append("<span>");
  elem.find("span").attr("comment",self.attr("comment")).text(self.text());
  return elem;
};

var animateDragOver = function(event, ui) {
  ui.helper.addClass("drag-query", 200);
}

var animateDragOut = function(event, ui) {
  ui.helper.removeClass("drag-query", 200);
}

var drop = function(event, ui) {
  var self = $(this);
  var query = ui.helper.clone().appendTo(self).draggable({"containment":"parent"}).addClass("query").removeClass("drag-query ui-draggable-dragging");
  query.position(ui.position);
  query.disableSelection();
  var div = $("<div>");
  query.append(div);
  div.addClass("vars");
  $.each(ui.draggable.data("projections"),
         function(i, value) {
           var span = $("<div>");
           div.append(span);
           span.text(value["name"]);
           span.tooltip({"show":{delay:"1000"},"items":"*","content":value["comment"]});
         });
  $(window).trigger("dropped_query", [$(ui.draggable)]);
};

function cancel(e) {
  if (e.preventDefault) { e.preventDefault(); }
  return false;
}

var externalDropStart = function(event) {
  return cancel(event);
};

var externalDrop = function(event) {
  for(var i=0;i<event.dataTransfer.items.length;i++) {
    event.dataTransfer.items[i].getAsString(function(str) {
      console.log(str);
    });
  }
  return cancel(event);
};

var layoutResize = function(name, pane, state, option, layout) {
  
};

function showDialogForEndpoint(uri) {
  $("#endpoint-dialog").dialog({modal:true,draggable:false,resizable:false,
                                title:"SPARQL Endpoint Options"})
    .dialog("open");
}

function loadSparqlDescription(uri) {
  var deferred = $.Deferred();
  store.load("remove", uri, function(success, numTriples) {
    if(success) {
      deferred.resolveWith(window, [uri, store]);
      var arr = store.match(null, store.rdf.createNamedNode(SD.endpoint),
                            store.rdf.createNamedNode(uri)).toArray();
      var subj = uri;
      if(arr.length > 0) {
        subj = arr[0].object.value;
      }
      var node = store.rdf.createNamedNode(subj);
      arr = store.match(node, store.rdf.createNamedNode(RDFS.label)).toArray();
      var label = "";
      if(arr.length > 0) {
        label = arr[0].object.value;
      }
      var comment = "";
      arr = store.match(node, store.rdf.createNamedNode(RDFS.comment)).toArray();
      if(arr.length > 0) {
        comment = arr[0].object.value;
      }
      if(label == "") {
        showDialogForEndpoint(uri);
      } else {
        $("#endpoints").find("option.default").remove();
        var opt = $("<option>");
        opt.val(uri).text(label);
        opt.attr("tooltip",comment);
        opt.appendTo("#endpoints select");
      }
    } else {
      deferred.rejectWith(window, [uri]);
      showDialogForEndpoint(uri);
    }
  });
  return deferred.promise();
}

function dropUrl(event) {
  var items = event.dataTransfer.items;
  for(var i=0;i<items.length;i++) {
    if(items[i].type == "text/uri-list") {
      items[i].getAsString(function(str) {
        $("#endpoints").find("option.default").remove();
        var opt = $("<option>");
        opt.val(str).text(str);
        opt.appendTo("#endpoints select");
      });
    }
  }
  if (event.preventDefault) { event.preventDefault(); }
  return false;
}

function configureEndpointDrop() {
  $("#endpoints").bind("dragover", function(event) {
    event.stopPropagation();
    return false;
  }).bind("drop", dropUrl);
}

$(document).ready(function() {
  // have jQuery propogate the dataTransfer object from the browser's event
  jQuery.event.props.push('dataTransfer');
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
    center__showOverflowOnHover: true,
  };
  var rightLayout,leftLayout;

  var layout = $("body").layout({east__size:"250",east__onresize:function() {
    console.log("East");
    rightLayout.resizeAll();
  },center__onresize:function() {
    console.log("center");
    leftLayout.resizeAll();
  }});
  leftLayout = $("#left-pane").layout(rightOpts);
  rightLayout = $(".ui-layout-east").layout(rightOpts);

  configureEndpointDrop();
  $("#query-list .ui-layout-center").bind("drop",externalDrop);
  $.contextMenu({"selector":"div.query span","items":{remove:{name:"Remove Query",callback:function(event, data) { data.$trigger.parent().remove(); }}}});

  // set up the query dragging
  $("div#query-list").tooltip({"show":{"delay":1000},"items":"li",
                               "content":function() {
                                 return $(this).attr("comment")
                               }})
    .find("ul").selectable({filter:"li"})
    .find("li").draggable({"helper":"clone","appendTo":"body","helper":helper,
                           "start":doSelect})
    .addClass("ui-widget-content");
  $("div#query-list li").click(function(event) {
    $(event.target).parent().find(".ui-selected").removeClass("ui-selected");
    $(event.target).addClass("ui-selected");
    $(window).trigger("query_selected", [$(event.target)]);
  });
  $("div#canvas").droppable({"accept":"li.query-item","activeClass":"drop-here",
                             "hoverClass":"drop-now","drop":drop,
                             "over":animateDragOver,"out":animateDragOut});
  $("li#list-people").data("projections",[{"name":"id","comment":"The URI identifying a person"},{"name":"given","comment":"Given name for a person"},{"name":"family","comment":"Family name for a person"},{"name":"account","comment":"Account name held by this person"}]);
});
