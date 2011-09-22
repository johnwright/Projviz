(function() {
  if (! phantom.args || phantom.args.length !== 2) {
    console.log("Usage: projviz.js <input.js> <output.png>");
    phantom.exit();
  }
  
  var page = new WebPage();
  page.onConsoleMessage = function(msg) { console.log(msg); };
  page.onLoadFinished = function() {
    page.injectJs("raphael/raphael-min.js");
    page.injectJs("projviz.js");
    page.injectJs(phantom.args[0]);
    page.render(phantom.args[1]);
    phantom.exit();
  }
  
  page.content = '<html><body></body></html>';
})()