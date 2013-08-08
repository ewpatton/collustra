/**
 * Main.js provides the basic setup for Collustra and is meant to link together
 * the application model and the application view.
 *
 * @copyright © 2013 Evan W. Patton
 * @license
 * Released under the MIT license
 * {@link https://raw.github.com/ewpatton/collustra/master/LICENSE}
 *
 * @file
 */

/**
 * A convenience function for debugging purposes. It should be removed for
 * production code.
 */
var logArgs = function() { console.log(arguments); };

function updateEndpoint(uri) {
  var dialog = $("#endpoint-dialog");
  var newUri = dialog.find("[name='endpoint-url']").val();
  var newLabel = dialog.find("[name='endpoint-label']").val();
  var newComment = dialog.find("[name='endpoint-comment']").val();
  if ( newUri == "" || newLabel == "" ) return false;
  var opt = $("#endpoints [value='"+uri+"']");
  if ( opt.length == 0 ) {
    opt = $("<option>");
    opt.appendTo("#endpoints select");
    if ( !$("#endpoints").hasClass("hasItems") ) {
      $("#endpoints").addClass("hasItems");
    }
  }
  opt.val(newUri);
  opt.text(newLabel);
  opt.attr("comment", newComment);
  return true;
}

function removeEndoint(uri) {
  $("#endpoints [value='"+uri+"']").remove();
  if ( $("#endpoints select").children().length == 0 ) {
    var opt = $("<option>");
    opt.text("No Endpoint");
    opt.appendTo("#endpoints select");
  }
}

/**
 * Startup function that launches the application when the document is ready.
 */
$(document).ready(function() {
  // have jQuery propogate the dataTransfer object from the browser's event
  jQuery.event.props.push('dataTransfer');

  // lay out the UI and enable context menus (should be moved to view.js)
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

  $.contextMenu({"selector":"div.query span",
                 "items":{remove:{name:"Remove Query",
                                  callback:function(event, data) {
                                    data.$trigger.parent().remove();
                                  }}}});

  App.init();
  View.init();
});
