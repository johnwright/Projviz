var Projviz = function(initializer, paper) {
  var params = Projviz.init(initializer);
  
  if (! paper) {
    paper = params.elementId
      ? Raphael(document.getElementById(params.elementId), params.width, params.height)
      : Raphael(0, 0, params.width, params.height);
  }
  
  Projviz.render(params, paper);
}

Projviz.mondayBefore = function(date) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() - (d.getDay() - 1) % 7);
  return d;
}

Projviz.mondayAfter = function(date) {
  var d = new Date(date.getTime());
  d.setDate(d.getDate() + (8 - d.getDay()) % 7);
  return d;
}

Projviz.DAY_MILLIS = 1000 * 60 * 60 * 24;

Projviz.WEEK_MILLIS = Projviz.DAY_MILLIS * 7;

Projviz.init = function(initializer) {
  function isWorkingDay(date) {
    var day = date.getDay();
    return day >= 1 && day <= 5;
  }
  
  function nextWorkingDay(date) {
    var d = new Date(date.getTime());
    while (! isWorkingDay(d)) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }
  
  function Task(name) {
    this.name = name || "";
    this.assignee = "";
    this.starting = new Date();
    this.starting.setHours(0);
    this.starting.setMinutes(0);
    this.starting.setSeconds(0);
    this.starting.setMilliseconds(0);
    this.duration = 1;
    
    // ending date calculation (skips non-working days)
    var ending = null;
    this.ending = function() {
      if (ending == null) {
        ending = new Date(this.starting.getTime());
        for (var i = 0; i < this.duration; i++) {
          ending = nextWorkingDay(ending);
          ending.setDate(ending.getDate() + 1);
        }
      }
      return ending;
    }
  }
  
  function Config() {
    var current = null;
    this.title = "";
    this.tasks = [];
    this.task = function(name) {
      var previous = current;
      current = new Task(name);
      if (previous != null) {
        current.starting = previous.ending();
        current.assignee = previous.assignee;
      }
      this.tasks.push(current);
      return this;
    }
    this.assignee = function(name) {
      current.assignee = name;
      return this;
    }
    this.starting = function(y, m, d) {
      // skips non-working days
      current.starting = nextWorkingDay(new Date(y, m - 1, d, 0, 0, 0, 0));
      return this;
    }
    this.duration = function(d) {
      current.duration = d;
      return this;
    }
  }
  
  var config = new Config();
  initializer(config);
  if (config.tasks.length == 0) return;
  var params = {};
  params.title = config.title || "";
  params.tasks = config.tasks;
  
  params.elementId = config.elementId || null;
  params.width = config.width || 800;
  params.height = config.height || 600;
  params.titleFontSize = config.titleFontSize || 16;
  params.labelFontSize = config.labelFontSize || 10;
  params.leftMargin = config.leftMargin || 20;
  params.rightMargin = config.rightMargin || 20;
  params.middlePadding = config.middlePadding || 50;// TODO make this automatic
  params.topPadding = config.topPadding || 20;
  params.diamondSize = config.diamondSize || 3;
  params.showDayMarkers = config.showDayMarkers || false;
  params.colors = config.colors || ["0-#090-#eee", "0-#00c-#eee", "0-#c00-#eee"]
  
  // determine first and last dates
  params.firstDate = params.tasks[0].starting;
  params.lastDate = params.tasks[0].ending();
  for (var i = 1; i < params.tasks.length; i++) {
    var t = params.tasks[i];
    if (t.starting < params.firstDate) {
      params.firstDate = t.starting;
    }
    if (t.ending() > params.lastDate) {
      params.lastDate = t.ending();
    }
  }
  
  // determine week count
  var d1 = Projviz.mondayBefore(params.firstDate);
  var d2 = Projviz.mondayAfter(params.lastDate);
  params.weekCount = (d2.getTime() - d1.getTime()) / Projviz.WEEK_MILLIS;
  
  return params;
}

Projviz.render = function(p, paper) {  
  function text(x, y, text, fontSize, anchor) {
    anchor = anchor || "start";
    
    var t = paper.text(x, y, text);
    t.attr({
      "font-family": "Verdana, Geneva, sans-serif",
      "font-size": fontSize,
      "text-anchor": anchor
    });
    return t;
  }
  
  function line(x1, y1, x2, y2) {
    return paper.path(["M", x1, y1, "L", x2, y2, "z"].join(" "));
  }
  
  function diamond(x, y, size) {
    var path = paper.path(["M", x - size, y,
                           "L", x,        y - size,
                           "L", x + size, y,
                           "L", x,        y + size,
                           "z"].join(" "));
    path.attr({"fill": "black"});
    return path;
  }
  
  function dd(n) {
    return n < 10 ? "0" + n : n;
  }
  
  // draw title
  var title = text(p.leftMargin, p.topPadding, p.title, p.titleFontSize);
  var titleBounds = title.getBBox();
  
  // draw timeline
  var timelineX = titleBounds.x + titleBounds.width + p.middlePadding;
  var timelineY = titleBounds.y + (4 * titleBounds.height / 5);
  var timelineW = Math.floor((p.width - timelineX - p.rightMargin) / (p.weekCount * 7)) * p.weekCount * 7;
  line(timelineX, timelineY, timelineX + timelineW, timelineY);
  
  // draw timeline week markers
  var weekLength = timelineW / p.weekCount;
  var dayLength = weekLength / 7;
  var d = Projviz.mondayBefore(p.firstDate);
  for (var i = 0; i < p.weekCount + 1; i++) {
    diamond(timelineX + (i * weekLength), timelineY, p.diamondSize);
    
    var dateLabelText = [dd(d.getDate()), "/", dd(d.getMonth() + 1)].join("");
    var dateLabel = text(timelineX + (i * weekLength), timelineY - p.labelFontSize, dateLabelText, p.labelFontSize, "middle");
    d.setDate(d.getDate() + 7);
    if (p.showDayMarkers) {
      // TODO day markers are buggy
      for (var j = 1; j < 7; j++) {
        var dayMarkerX = timelineX + (i * weekLength) + (j * dayLength);
        line(dayMarkerX, timelineY - p.diamondSize, dayMarkerX, timelineY + p.diamondSize);
      }
    }
  }
  
  // sort tasks by assignee position, then by starting date
  var assignees = {};
  var assigneeCount = 0;
  for (var i = 0; i < p.tasks.length; i++) {
    var obj = assignees[p.tasks[i].assignee];
    if (! obj) {
      assignees[p.tasks[i].assignee] = {order: assigneeCount, color: p.colors[assigneeCount % p.colors.length]};
      assigneeCount++;
    }
  }
  p.tasks.sort(function(a, b) {
    var cmp = assignees[a.assignee].order - assignees[b.assignee].order;
    if (cmp == 0) {
      cmp = a.starting.getTime() - b.starting.getTime();
    }
    return cmp;
  });
  
  // draw tasks
  var yPos = timelineY + 4 * p.labelFontSize;
  var allLabels = [];
  for (var i = 0; i < p.tasks.length; i++) {
    var task = p.tasks[i];
    var startDayIndex = (task.starting - Projviz.mondayBefore(p.firstDate)) / Projviz.DAY_MILLIS;
    var x = timelineX + (dayLength * startDayIndex);
    var w = dayLength * ((task.ending() - task.starting) / Projviz.DAY_MILLIS);
    
    var labelLineCount = task.name ? task.name.split("\n").length : 0;
    if (task.name) {
      var label = text(x + (p.labelFontSize / 2), yPos, task.name, p.labelFontSize);
      allLabels.push(label);
      
      var labelBounds = label.getBBox();
      label.backing = paper.rect(labelBounds.x, labelBounds.y, labelBounds.width, labelBounds.height);
      label.backing.attr({"stroke": "white", "fill": "white"});
      
      yPos = labelBounds.y + labelBounds.height + (p.labelFontSize / 3);
    }

    var dottedLine = line(x, timelineY, x, yPos);
    dottedLine.attr({"stroke-dasharray": ". "});
    
    var taskRect = paper.rect(x, yPos, w, p.labelFontSize);
    taskRect.attr({"stroke": "white", "fill": assignees[task.assignee].color});
    
    yPos += p.labelFontSize / 2;
  }
  
  // bring labels to the front
  for (var i = 0; i < allLabels.length; i++) {
    allLabels[i].backing.toFront();
    allLabels[i].toFront();
  }
}