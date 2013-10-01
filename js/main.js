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
function logArgs() {
  console.log(arguments);
}

function updateEndpoint(uri) {
  var dialog = $("#endpoint-dialog");
  var newUri = dialog.find("[name='endpoint-url']").val();
  var newLabel = dialog.find("[name='endpoint-label']").val();
  var newComment = dialog.find("[name='endpoint-comment']").val();
  if ( newUri === "" || newLabel === "" ) {
    return false;
  }
  var opt = $("#endpoints [value='"+uri+"']");
  if ( opt.length === 0 ) {
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
  if ( $("#endpoints select").children().length === 0 ) {
    var opt = $("<option>");
    opt.text("No Endpoint");
    opt.appendTo("#endpoints select");
  }
}

/**
 * Startup function that launches the application when the document is ready.
 */
$(document).ready(function() {
  App.init();
  View.init();
});

// for development only
//$.ajaxSetup({"cache":false});
