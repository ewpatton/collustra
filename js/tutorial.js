var TutorialDialog = null;
var doTutorial = false;

$(function() {
  /*
  if ( Modernizr.localstorage ) {
    if ( localStorage.getItem( "tutorial.shown" ) == "true" ) {
      return;
    }
  }
  */
  TutorialDialog = $("<div>");
  var tut_text = $("<p id='tutorial-text'>");
  var tut_nav = $("<p id='tutorial-nav'>");
  var a = $("<a href='#'>Hide</a>");
  a.appendTo( tut_nav ).on( 'click', function(e) {
    e.preventDefault();
    doTutorial = false;
    TutorialDialog.dialog( "destroy" );
    if ( Modernizr.localstorage ) {
      localStorage.setItem( "tutorial.shown", "true" );
    }
    TutorialDialog.remove();
    tutorial.clearTransition();
  } );
  $("<span>").appendTo( tut_nav );
  a = $("<a href='#'>Next &gt;&gt;</a>");
  a.appendTo( tut_nav ).on( 'click', function(e) {
    e.preventDefault();
    tutorial.advance();
  } );
  TutorialDialog.append( tut_text ).append( tut_nav ).appendTo( "body" );
  tutorial.start( TutorialDialog );
  if ( Modernizr.localstorage ) {
    localStorage.setItem( "tutorial.shown", "true" );
  }
  doTutorial = true;
});

function Tutorial() {
  this.screens = [];
  this.transition = [];
  this.activeSelector = null;
  this.activeEvent = null;
  this.activeHandler = null;
  this.index = -1;
}

Tutorial.prototype.show = function(options) {
  this.screens.push( {
    "text": options.text,
    "position": options.position
  } );
  return this;
};

Tutorial.prototype.on = function(selector, event) {
  this.transition.push(
    { "selector": selector,
      "event": event }
  );
  return this;
};

Tutorial.prototype.clearTransition = function() {
  if ( this.activeSelector != null ) {
    $( this.activeSelector ).off( this.activeEvent, this.activeHandler );
    this.activeSelector = null;
    this.activeEvent = null;
    this.activeHandler = null;
  }
};

Tutorial.prototype.advance = function() {
  this.clearTransition();
  this.index++;
  this.render();
  return this;
};

Tutorial.prototype.start = function(dialog) {
  dialog.dialog( { "resizable": false, "dialogClass": "no-title tutorial"} );
  this.dialog = dialog;
  this.index = 0;
  return this.render();
};

Tutorial.prototype.render = function() {
  var self = this;
  this.clearTransition();
  this.activeHandler = function() {
    self.advance();
  };
  var screen = this.screens[ this.index ];
  this.dialog.find('#tutorial-text').html( screen.text );
  if ( 'position' in screen && screen.position != null ) {
    this.dialog.dialog( "option", "position", screen.position );
  }
  if ( !screen.final ) {
    this.dialog.find( "#tutorial-nav span" )
      .text( "" + ( this.index + 1 ) + "/" + this.screens.length );
    var eventData = this.transition[ this.index ];
    if ( 'wait' in eventData && eventData.wait === true ) {
      return this;
    }
    this.activeSelector = eventData.selector === "window" ?
      window : eventData.selector;
    this.activeEvent = eventData.event;
    $( this.activeSelector ).on( this.activeEvent, this.activeHandler );
  } else {
    this.activeHandler = null;
    var nav = this.dialog.find('#tutorial-nav');
    nav.empty();
    var a = $("<a href='#'>");
    a.appendTo( nav ).text("Close").click(function(e) {
      e.preventDefault();
      self.dialog.dialog( "close" );
      this.index = 0;
    });
  }
  return this;
};

Tutorial.prototype.end = function(text) {
  this.screens.push({
    "text": text,
    "position": {"my": "center", "at": "center", "of": "body"},
    "final": true
  });
  return this;
};

Tutorial.prototype.waitForNext = function() {
  this.transition.push({"wait":true});
  return this;
};

var tutorial = new Tutorial()
  .show({"text": "Specify SPARQL endpoints or RDF documents using the " +
                 "Endpoints pane. To add an Endpoint, click 'Add'.",
         "position": {"my": "right top", "at": "left center",
                      "of": "#endpoints"}})
  .on("#endpoint-dialog", "dialogopen")
  .show({"text": "To add an endpoint, you must provide a URL to the endpoint " +
         "and give it a label. For example, the DBpedia endpoint is " +
         "<a href='http://dbpedia.org/sparql'>http://dbpedia.org/sparql</a>." +
         "Enter this URL below with the label 'DBpedia', then click 'Save'.",
         "position": {"my": "center bottom", "at": "center top",
                      "of": "#endpoint-dialog"}})
  .on("#endpoint-dialog", "dialogclose")
  .show({"text": "When you add an Endpoint, Collustra queries it to retrieve " +
         "a list of concepts and queries. In a few moments, you will see a " +
         "list of Concepts appear to right.",
         "position": {"my": "right center", "at": "left center",
                      "of": "#concepts"}})
  .on("#concepts", "rendered")
  .show({"text": "Select the 'Country (dbo)' concept from the list and drag " +
         "it to the Query pane to the left to create a query for countries."})
  .on("window", "dropped_query")
  .show({"text": "When you drop a concept into this area, it creates a new " +
         "query. By default, queries have an 'id' parameter to identify " +
         "resources. Click next to continue.",
         "position": {"my": "left top", "at": "right top",
                      "of": "#canvas .query"}})
  .waitForNext()
  .show({"text": "Sample query results will appear in here. Query results " +
         "can be rendered using different visualizations, including tables, " +
         "maps, and charts. You can also view the raw query text.",
         "position": {"my": "left bottom", "at": "left top",
                      "of": ".tables"}})
  .waitForNext()
  .end("Those are the basics of Collustra. Happy querying!");
