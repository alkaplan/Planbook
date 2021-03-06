var ref = {
  'monday': getMonday(new Date()),
};

window.server = ''//'davish.iriscouch.com'; // hermes.local

var db = null;
var remoteCouch = false;
$('document').ready(function() {
  $('.stuff').hide();
  $('.mobile').hide();
  $('.navbar').hide();
  $.ajax({
    url: "/session",
    success: function(data) {
      if (data.username && data.password) {
        ref.user = data.username;
        login(data.username, data.password, function(data) { // Login was successful
          $('.stuff').show();
          $('.navbar').show()
          $('.mobile').show();
          $('li#username').children('a').text(data.user);
          $('.loggedIn').show();
          $('.loggedOut').hide();
          $('textarea').each(function(index, attribute) {
            $(this).removeAttr("disabled");
          });
        }, function() { // login not successful
          $('.choiceModal').modal({backdrop: 'static', 'keyboard': false});
          $('li#username').children('a').text('');
          $('.loggedIn').hide();
          $('.loggedOut').show();
          $('textarea').each(function(index, attribute) {
            $(this).attr("disabled", "");
          });
        });
      } else { // no one session for this browser found
        $('.choiceModal').modal({backdrop: 'static', 'keyboard': false});
        $('li#username').children('a').text('');
        $('.loggedIn').hide();
        $('.loggedOut').show();
        $('textarea').each(function(index, attribute) {
          $(this).attr("disabled", "");
        });
      }
    }
  });
  drawDates();

  $("#subjects").append('<div class="row"><div class="col-sm-2 col-sm-offset-10" id="year"></div></div>')


});

function saveWeek(o) {
  db.get(ref.monday.toISOString().slice(0, 10)).then(function (w) {
    // update the document
    if (w.assignments != JSON.stringify(o)) {
      db.put({
        '_id': w._id,
        '_rev': w._rev,
        'assignments': JSON.stringify(o)
      });
    }

  }, function (err, response) { // document couldn't be found
    if(err) { // make a new document
      db.put({
        '_id': ref.monday.toISOString().slice(0, 10),
        'assignments': JSON.stringify(o),
      });
    } else {

    }
  });
}

function getWeek(c) {
  db.get(ref.monday.toISOString().slice(0,10)).then(function(w) {
    c(JSON.parse(w.assignments));
  }, function (err, response) {
    if(err) { // make a new document
      c(genBlankAssignments());
      db.put({
        '_id': ref.monday.toISOString().slice(0,10),
        'assignments': JSON.stringify(genBlankAssignments())
      });
      
    } else {

    }
  });
}

function getAssignmentValues() {
  var d = {};
  $('textarea').each(function (index, ta) {
    // with the cell's ID as the key, put the contents of the array, and the boolean of if it's completed or not, into the object.
    d[ta.id] = [ta.value, $(this).css("text-decoration") == "line-through"]; 
  });
  return d;
}

function setAssignmentValues(d) {
  $('textarea').each(function (index, ta) {
    $(ta).css("text-decoration", "none solid rgb(0, 0, 0)");
    if (d[ta.id]) {
      $(ta).val(d[ta.id][0]);
      if (d[ta.id][1])
        $(ta).css("text-decoration", "line-through");
    }
    else
      $(ta).val('');
  });
}

function login(user, pswd, c, fail) {
  $.ajax({ // now get a new auth cookie from couch
    type: "POST",
    url: "/login", 
    data: {
      'username': user,
      'password': pswd
    },
    statusCode: {
      403: fail,
      500: function() {
        alert("There's been a server error. Contact NLTL for assistance.");
      }
    },
    success: function(data) {
      ref.user = data.user;
      server = data.dbURL;
      db = new PouchDB('http://'+ data.user +':'+ pswd +'@'+server+':5984/' + data.user);
      db.get("settings").then(function(settings) {
        ref.settings = settings;
        renderRows(ref.settings.rows);
      });
      
      if (c) c(data);
    }
  });
}

function signup(user, pswd, c, fail) {
  $.ajax({
    type: "POST",
    url: "/signup", 
    data: {
      'username': user,
      'password': pswd
    },
    statusCode: { 
      403: fail,
      500: function() {
        alert("There's been a server error. Contact NLTL for assistance.");
      }
    },
    success: function(data) {
      location.reload(true);
    }
  });
}


function renderRows(rows) {
  if ($('.container').width() >= 720) {
    $("#planner").html("");
    renderSubjects(rows);
    for (var i = 0; i < rows.length; i++) {
      var row = $("#planner").append('<div class="row"></div>');
      for (var j = 1; j <= 5; j++) {
        if (j == 1)
          row.append('<div class="col-sm-2 col-sm-offset-2"><textarea class="ta" id="'+ String(i+1) + String(j)+'"></textarea><button class="done btn btn-default btn-xs" style="display: none;"><span class="glyphicon glyphicon-ok"></span></button></div>');
        else
          row.append('<div class="col-sm-2"><textarea class="ta" id="'+ String(i+1) + String(j)+'"></textarea><button class="done btn btn-default btn-xs" style="display: none;"><span class="glyphicon glyphicon-ok"></span></button></div>');
      }
    }
    var labs = $("#planner").append('<div class="row"></div>');
    for (var j = 1; j <= 5; j++) {
      if (j==1)
        labs.append('<div class="col-sm-2 col-sm-offset-2"><textarea class="labs ta" id="0' + String(j)+'"></textarea></div>');
      else
        labs.append('<div class="col-sm-2"><textarea class="labs ta" id="0' + String(j)+'"></textarea></div>');
    }
    taListen();
    getWeek(setAssignmentValues);

  }
  else { // Mobile Site
    var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    $(".mobile").html("");
    // $(".mobile").append('<div class="row"><div class="col-sm-2">Monday</div><div class="col-sm-2">Tuesday</div><span>Wednesday</span><div class="col-sm-2">Thursday</div><div class="col-sm-2">Friday</div></div>');
    for (var j = 1; j <= 5; j++) {
      var row = $(".mobile").append('<div class="row"></div>');
      row.append('<div class="col-sm-2"><h3>'+days[j-1]+'<h3></div>');
      for (var i = 0; i < rows.length; i++) {
        row.append('<div class="col-sm-2"><h4>'+rows[i]+'</h4><textarea class="ta" id="'+ String(i+1) + String(j)+'"></textarea></div>')
      }
    }
    taListen();
    $("textarea").each(function() {
      $(this).prop("readonly", true);
      $(this).css("width", "50%")
    });
    getWeek(setAssignmentValues);
  }

}

function renderSubjects(r) {
  $("#subjects").html("");
  for (var i = 0; i < r.length; i++)
    $('#subjects').append('<div class="subj" id="'+(i+1)+'"><span class="subjectspan">'+r[i]+'</span> <span class="subjbtns" style="display: none;"><button class="edit btn btn-default btn-xs""><span class="glyphicon glyphicon-edit"></span></button> <button class="delete btn btn-xs btn-danger">-</button></span></div>');
  $('#subjects').append('<div class="subj" id="0">Labs</div>')

  subjectListen();
  taListen();
}

function getMonday(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() - 1));
}


function genBlankAssignments() {
  var d = {};
  $('textarea').each(function (index, ta) {
    d[ta.id] = ['', false];
  });
  return d;
}


function drawDates() {
  $('.day').each(function(index, element) {
    var d = new Date(ref.monday.getFullYear(), ref.monday.getMonth(), ref.monday.getDate() + index);
    var isToday = (d.getFullYear = new Date().getFullYear && d.getMonth() == new Date().getMonth() && d.getDate() == new Date().getDate())
    if (isToday)
      $(element).html('<span id="today">' + $(element).children('span').html() + '</span> ' + (d.getMonth()+1) + '/' + d.getDate());
    else
      $(element).html('<span>' + $(element).children('span').html() + '</span> ' + (d.getMonth()+1) + '/' + d.getDate());
  });
}

$.fn.slide = function(dist, t, c) {
  // Slide an element to the left or right by a certaind distance, in pixels.
  var element = this[0];
  var p = $(element).css("position");
  $(element).css("position", "relative");
  if (!t)
      t = 500;
  $(element).animate({
      left: "+=" + dist
  }, t, function() {
      $(element).css({left: -dist});
      $(element).animate({left: 0}, t);
      if (c)
          c();
  });
  $(element).css("position", p);
}

function setReminder(obj, date, interval, metadata) {
  /*
    Structure of obj:
    Keys are Date ISOStrings, values are arrays with each reminder being an object, with metadata such as the message, duedate, subject, etc.

    Interval is in days.
    Metadata is another object, with, well, metadata.
  */

  var dueDate = new Date(date).stripTime();

  // Count backwards from the duedate, subtracting the number of days in the interval, so you get a date 
  for (var d = dueDate; d.getTime() > new Date().stripTime(); d.setDate(d.getDate() - interval)) {
    if (obj[d.toISOString().slice(0,10)])
      obj[d.toISOString().slice(0,10)].push(metadata);
    else
      obj[d.toISOString().slice(0,10)] = [metadata];
  };

  return obj;
}

Date.prototype.stripTime = function() {
  this.setMilliseconds(0)
  this.setSeconds(0);
  this.setMinutes(0);
  this.setHours(0);
  return this;
}
String.prototype.escapeHTML = function() {
    return $('<div/>').text(this).html();
};