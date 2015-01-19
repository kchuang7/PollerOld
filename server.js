var flash = require('connect-flash');
var connect = require('connect');
var express = require('express.io');
var cookieParser = require('cookie-parser');
var session = require('express-session');

var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var async = require('async');

var geoip = require('geoip');
// ipv4 address lookup
// Open the country data file
var Country = geoip.Country;
var country = new Country('./node_modules/geoip/GeoIP.dat');
var IPToLocation = require('./app/IPToLocation');

var colors = require('colors');

var passport = require('passport');
var mongoose = require('mongoose');

var redis = require("redis");
var client = redis.createClient();

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

client.on("error", function (err) {
  console.log("Error " + err);
});

var User = require('./app/models/user');
var Post = require('./app/models/post');
var Postlist = require('./app/models/postlist');
var resources = require('./app/resources');

mongoose.connect('mongodb://localhost/etc/node/nodeapps/Poller/data');

require('./config/passport')(passport); // pass passport for configuration

//var routes = require('./routes/index');
//var users = require('./routes/users');
var routes = require('./app/routes');

var app = express();
var MongoStore = require('connect-mongo')(session);

// view engine setup
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: "3267719000748097834948612780578772912341623486576164657569765390123344025",
  store: new MongoStore({
    db : 'Poller',
  }),
  auto_reconnect: true
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//app.use('/', routes);
//app.use('/users', users);

require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

/// catch 404 display custom 404 page
app.use(function(req, res, next) {
  res.status(404);
  var username = null;
  if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
    username = req.user.username;
  // respond with html page
  if (req.accepts('html')) {
    Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
      var communitiesArray = []
      for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
        communitiesArray.push(postlists[z].community);
      res.render('404', { username : username, loggedIn : req.session.loggedIn, message : 'Cannot find page: ' + req.url + '.', communityList : communitiesArray, url : req.url });
      return;
    }); // end postlist communities query
  } // end if html
}); // end 404 handler

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

var http = require('http').Server(app); // creates httpserver using express
var io = require('socket.io')(http); // latches socket.io functionality onto http server
var passportsocketio = require("passport.socketio"); // get session data into socket.io

// creates server listening on port 80
http.listen(80, function() { 
  console.log('Listening on port 80');
});

var connectedUsers = {};

/* PASSPORT.SOCKETIO IMPLEMENTATION */

//With Socket.io >= 1.0
io.use(passportsocketio.authorize({
  cookieParser: express.cookieParser,
  key:         'connect.sid',       // the name of the cookie where express/connect stores its session_id
  secret:      '3267719000748097834948612780578772912341623486576164657569765390123344025',    // the session_secret to parse the cookie
  store:       new MongoStore({ // we NEED to use a sessionstore. no memorystore please
    db : 'Poller',
  }),
  auto_reconnect: true,
  fail:        onAuthorizeFail 
}));

// This function accepts every client unless there's a critical error
function onAuthorizeFail(data, message, error, accept){
  if(error)  throw new Error(message);
  return accept();
}

/* SOCKET-ANTI-SPAM IMPLEMENTATION */

var antiSpam = require('socket-anti-spam');
var antiSpam = new antiSpam({
  spamCheckInterval: 3000, // define in how much miliseconds the antispam script gives a minus spamscore point
  spamMinusPointsPerInterval: 3, // how many minus spamscore points after x miliseconds?
  spamMaxPointsBeforeKick: 9, // needed points before kick
  spamEnableTempBan: true, // Enable the temp ban system (temp ban users after x amount of kicks within x amount of time)
  spamKicksBeforeTempBan: 3, // This many kicks needed for a temp ban
  spamTempBanInMinutes: 10, // This many minutes temp ban will be active
  removeKickCountAfter: 1, // This many minutes until the kick counter is decreasing with 1 for the user
  debug: false // debug? not needed
});

/* SOCKET.IO LISTENERS AND HANDLERS */

var editDemographicsUserWaitlist = {}; // waitlist for users to impose a time interval between demographic changes

// new client connection "master" listener
io.on('connection', function(socket){

  antiSpam.onConnect(socket); // bind antispam module to socket

  var clientIP = socket.request.connection.remoteAddress; // TODO remove test IPs 101.55.128.12 98.231.210.111
  if (socket.request.user.logged_in)
    console.log(socket.request.user.username + ' connected at IPv4: ' + clientIP);
  else
    console.log('User connected at IPv4: ' + clientIP);

  var userid = routes.userid;
  if (userid != undefined) // checks if connected client is a logged in user
    connectedUsers[userid] = true;
  module.exports.connectedUsers = connectedUsers;
  console.log(connectedUsers); // TODO remove

  var finishedExport = false; // kept to prevent connection events from performing getPostUser queries before the routes request

  finishedExport = routes.finishedExport;

  // NOTE: The following socket.emit is only intended for page renders but will ALWAYS fire under any connection establishment.
  // For example, if I were to access a profile page, the socket.io server will still fire the 'newConnect' event with all the data for absolutely no reason.
  // Code redesign is highly advised. Solution would be to send all JS data inside the router and make that data available globally on the client side.
  if (finishedExport) {
  // serves the post chart information upon connection (for main page)
  resources.getPostUser(routes.community, routes.page, routes.list, function(results) {
    var page = routes.page; // save page value into memory
    // data to be sent to client, assuming all are null to begin with
    var top5Array = [null, null, null, null, null], answerVotesArray = [], genUnidentArray = [], genMaleArray = [], genFemaleArray = [], ageUnidentArray = [], age_13_14Array = [], age_15_18Array = [], age_19_21Array = [], age_22_25Array = [], age_26_29Array = [], age_30_34Array = [], age_35_39Array = [], age_40Array = [], eduUnidentArray = [], eduMSArray = [], eduHSArray = [], eduAssociateArray = [], eduBachelorArray = [], eduMasterArray = [], eduPostgradArray = [], incomeUnidentArray = [], incomeLowerMiddleArray = [], incomeMiddleMiddleArray = [], incomeUpperMiddle1Array = [], incomeUpperMiddle2Array = [], incomeUpperArray = [], countriesArray = [], numCountriesArray = [], answerChoicesArray = [], locationsArray = [];
    for (i = 0; i < 5; i++) {
      var postuser = results[i];
      if (postuser == null) 
        break;
      // second index: 0 is post JSON object, 1 is user JSON object
      top5Array[i] = postuser[0]._id;
      answerVotesArray[i] = resources.parseValues(postuser[0].answers);
      genUnidentArray[i] = postuser[0].genderUnidentified;
      genMaleArray[i] = postuser[0].genderMale;
      genFemaleArray[i] = postuser[0].genderFemale;
      ageUnidentArray[i] = postuser[0].ageUnidentified;
      age_13_14Array[i] = postuser[0].age_13_14;
      age_15_18Array[i] = postuser[0].age_15_18;
      age_19_21Array[i] = postuser[0].age_19_21;
      age_22_25Array[i] = postuser[0].age_22_25;
      age_26_29Array[i] = postuser[0].age_26_29;
      age_30_34Array[i] = postuser[0].age_30_34;
      age_35_39Array[i] = postuser[0].age_35_39;
      age_40Array[i] = postuser[0].age_40;
      eduUnidentArray[i] = postuser[0].eduUnidentified;
      eduMSArray[i] = postuser[0].eduMS;
      eduHSArray[i] = postuser[0].eduHS;
      eduAssociateArray[i] = postuser[0].eduAssociate;
      eduBachelorArray[i] = postuser[0].eduBachelor;
      eduMasterArray[i] = postuser[0].eduMaster;
      eduPostgradArray[i] = postuser[0].eduPostgrad;
      incomeUnidentArray[i] = postuser[0].incomeUnidentified;
      incomeLowerMiddleArray[i] = postuser[0].incomeLowerMiddle;
      incomeMiddleMiddleArray[i] = postuser[0].incomeMiddleMiddle;
      incomeUpperMiddle1Array[i] = postuser[0].incomeUpperMiddle1;
      incomeUpperMiddle2Array[i] = postuser[0].incomeUpperMiddle2;
      incomeUpperArray[i] = postuser[0].incomeUpper;
      answerChoicesArray[i] = resources.parseKeys(postuser[0].answers);
      locationsArray[i] = postuser[0].locations;
      var temp = []; // for transferring arrays in countries to array to be sent to client
      for (j = 0; j < postuser[0].countries.length; j++)
        temp[j] = resources.parseValues(postuser[0].countries[j]);
      countriesArray[i] = resources.parseKeys(postuser[0].countries[0]);
      numCountriesArray[i] = temp;
      delete temp;
    } // end array loading
    socket.emit('newConnect', {
      top5 : top5Array,
      answerVotes : answerVotesArray,
      letters : resources.letterArray,
      ansColors : resources.answerColors,
      genderUnidentified : genUnidentArray,
      genderMale : genMaleArray,
      genderFemale : genFemaleArray,
      ageUnidentified : ageUnidentArray,
      age_13_14 : age_13_14Array,
      age_15_18 : age_15_18Array,
      age_19_21 : age_19_21Array,
      age_22_25 : age_22_25Array,
      age_26_29 : age_26_29Array,
      age_30_34 : age_30_34Array,
      age_35_39 : age_35_39Array,
      age_40 : age_40Array,
      eduUnidentified : eduUnidentArray,
      eduMS : eduMSArray,
      eduHS : eduHSArray,
      eduAssociate : eduAssociateArray,
      eduBachelor : eduBachelorArray,
      eduMaster : eduMasterArray,
      eduPostgrad : eduPostgradArray,
      incomeUnidentified : incomeUnidentArray,
      incomeLowerMiddle : incomeLowerMiddleArray,
      incomeMiddleMiddle : incomeMiddleMiddleArray,
      incomeUpperMiddle1 : incomeUpperMiddle1Array,
      incomeUpperMiddle2 : incomeUpperMiddle2Array,
      incomeUpper : incomeUpperArray,
      answerChoices : answerChoicesArray,
      countries : countriesArray,
      numCountries : numCountriesArray,
      locations : locationsArray,
      url : routes.url
    }); // end JSON emit
  }); // end getPostUser (to send to highcharts client)
  } // end if - check finished routes.js exports

  // upvote handler
  socket.on('upvote', function(data) {    
    var user = socket.request.user; // session's logged in user
    console.log('Upvote attempt by ' + user.username + '.'); // TODO logging in case of spam
    // vote validation - check logged in, then check if answered already
    if (!user.logged_in) {
      console.log('Upvote attempt by '.yellow + user.yellow + ' rejected - not logged in.'.yellow);
      socket.emit('notLoggedIn', { feature : 'post vote' });
    } else {
      Post.findOne({ _id : data.postid }, function(err, post) {
        if (err) return err;
        if (post != null) {
          if (user.upvotedPosts.indexOf(post._id) == -1) { // checks if post has not been upvoted before
            var neutralPosition = true; // true: neutral position, false: upvoted position (AFTER this vote is registered)
            if (user.downvotedPosts.indexOf(post._id) > -1) { // if post has been downvoted before, remove post from downvote array
              user.downvotedPosts.splice(user.downvotedPosts.indexOf(post._id), 1);
            } else { // only adds upvote to upvote array if upvoting from neutral position
              user.upvotedPosts.push(post._id); // adds post to upvoted array
              neutralPosition = false;
            } // end else
            User.findOne({ _id : post._user }, function(err, postUser) { // gets the post's creator user
              if (!neutralPosition)
                post.upvotes = post.upvotes+1;
              else
                post.downvotes = post.downvotes-1;
              post.calcScore();
              postUser.postScore = postUser.postScore+1;
              user.save(function(err) { if (err) throw err; });
              postUser.save(function(err) { if (err) throw err; });
              post.save(function(err) { if (err) throw err; });
              console.log('Upvote from '.green + user.username.green + ' validated.'.green);

              // updates post score and position in Redis postlists
              resources.calcPostScore(post, function() {});

              socket.emit('upvoteRender', { postid : post._id, neutral : neutralPosition }); // send info for reactive vote arrows only to logged in user
              io.emit('upvote', { postid : post._id, score : post.score, upvotes : post.upvotes, downvotes : post.downvotes }); // send to everyone including client that voted
            }); // end post user query
          } // end upvoted already if
          else
            console.log('Upvote attempt by '.yellow + user.username.yellow + ' rejected - already upvoted.'.yellow);
        } // end invalid post if
        else // this shouldn't ever fire if client is using web app as intended
          console.log('Answer submission by '.red + user.username.red + ' rejected - invalid post id.'.red);
      }); // end post query
    } // end initial if else
  }); // end upvote handler

  // downvote handler
  socket.on('downvote', function(data) {
    var user = socket.request.user;
    console.log('Downvote attempt by ' + user.username + '.'); // TODO logging in case of spam
    // vote validation - check logged in, then check if answered already
    if (!user.logged_in) {
      console.log('Downvote attempt by '.yellow + user.yellow + ' rejected - not logged in.'.yellow);
      socket.emit('notLoggedIn', { feature : 'post vote' });
    } else {
      Post.findOne({ _id : data.postid }, function(err, post) {
        if (err) return err;
        if (post != null) {
          if (user.downvotedPosts.indexOf(post._id) == -1) { // checks if post has been downvoted before
            var neutralPosition = true; // true: neutral position, false: downvoted position (AFTER this vote is registered)
            if (user.upvotedPosts.indexOf(post._id) > -1) { // if post has been upvoted before, remove post from upvote array
              user.upvotedPosts.splice(user.upvotedPosts.indexOf(post._id), 1);
            } else { // only adds downvote to downvote array if downvoting from neutral position
              user.downvotedPosts.push(post._id); // adds post to downvoted array
              neutralPosition = false;
            } // end else
            User.findOne({ _id : post._user }, function(err, postUser) { // gets the post's creator user
              if (!neutralPosition)
                post.downvotes = post.downvotes+1;
              else
                post.upvotes = post.upvotes-1;
              post.calcScore();
              postUser.postScore = postUser.postScore-1;
              user.save(function(err) { if (err) throw err; });
              postUser.save(function(err) { if (err) throw err; });
              post.save(function(err) { if (err) throw err; });
              console.log('Downvote from '.green + user.username.green + ' validated.'.green);

              // updates post score and position in Redis postlists
              resources.calcPostScore(post, function() {});

              socket.emit('downvoteRender', { postid : post._id, neutral : neutralPosition }); // send info for reactive vote arrows only to logged in user
              io.emit('downvote', { postid : post._id, score : post.score, upvotes : post.upvotes, downvotes : post.downvotes }); // send to everyone including client that voted
            }); // end post user query
          } // end already downvoted if
          else
            console.log('Downvote attempt by '.yellow + user.username.yellow + ' rejected - already downvoted.'.yellow);
        } // end invalid post if
        else // this shouldn't ever fire if client is using web app as intended
          console.log('Answer submission by '.red + user.username.red + ' rejected - invalid post id.'.red);
      }); // end post query
    } // end initial if else
  }); // end downvote handler

  // askRequest handler
  socket.on('askRequest', function(data) {
    var user = socket.request.user;
    console.log('Ask request by ' + user.username + '.'); // TODO logging in case of spam
    // request validation - check logged in
    if (!user.logged_in) {
      console.log('Ask request by '.yellow + user.yellow + ' rejected - not logged in.'.yellow);
      socket.emit('notLoggedIn', { feature : 'ask' });
    } else {
      socket.emit('redirectAsk', {}); // instructs web page to redirect to the community's ask page
    } // end if-else
  }); // end askRequest handler

  // answerRequest handler
  socket.on('answerRequest', function(data) {
    var user = socket.request.user;
    console.log('Answer request by ' + user.username + '.'); // TODO logging in case of spam
    // request validation - check logged in, then check if answered already
    if (!user.logged_in) {
      console.log('Answer request by '.yellow + user.yellow + ' rejected - not logged in.'.yellow);
      socket.emit('notLoggedIn', { feature : 'answer vote' });
    } else {
      // check if answered already
      if (user.questionsAnswered.indexOf(data.postid) == -1) {
        console.log('Answer request from '.green + user.username.green + ' validated.'.green);
        socket.emit('answerModal', { gender : user.gender, age : user.age, education : user.education, income : user.income, postIndex : data.postIndex } );
      } else // this shouldn't ever fire if client is using web app as intended
        console.log('Answer submission by '.red + user.username.red + ' rejected - question already answered.'.red);
    } // end else
  }); // end answerRequest handler

  // answer modal form handler
  socket.on('answer', function(data) {
    var user = socket.request.user;
    console.log('Answer submission by ' + user.username + '.'); // TODO logging in case of spam
    // request validation - check logged in, then check if answered already
    if (!user.logged_in) { // this shouldn't ever fire if client is using web app as intended
      console.log('Answer submission by '.red + user.username.red + ' rejected - user not logged in.'.red);
      socket.emit('notLoggedIn', { feature : 'answer vote' });
    } // end if
    Post.findOne({ _id : data.postid }, function(err, post) {
      /* Malicious input handlers (if statements) */
      if (post != null) { // checks if client intentionally submitted a bogus or invalid postid
        if (data.answerChoice < post.answers.length && data.answerChoice >= 0) { // makes sure answer choice index is within bounds
          if (user.questionsAnswered.indexOf(data.postid) == -1) { // check if answered already
            if (typeof data.checkboxData == 'object' && data.checkboxData != null) { // makes sure checkboxData is an object (excludes strings, numbers, undefined, booleans) and makes sure it isn't null
              var demographics = []; // 0-gender, 1-age, 2-education, 3-income, 4-country
              // handles gender demographic updating
              if (data.checkboxData.hasOwnProperty('demographicGen') && data.checkboxData['demographicGen']) {
                switch (user.gender) {
                  case 'Male':
                    post.genderMale[data.answerChoice] = post.genderMale[data.answerChoice] + 1; // updates count for answer vote demo
                    post.genderMale[post.answers.length] = post.genderMale[post.answers.length] + 1; // updates count for total
                    post.markModified('genderMale');
                    demographics[0] = 'genderMale';
                    break;
                  case 'Female':
                    post.genderFemale[data.answerChoice] = post.genderFemale[data.answerChoice] + 1; // updates count for answer vote demo
                    post.genderFemale[post.answers.length] = post.genderFemale[post.answers.length] + 1; // updates count for total
                    post.markModified('genderFemale');
                    demographics[0] = 'genderFemale';
                    break;
                } // end switch
              } else {
                post.genderUnidentified[data.answerChoice] = post.genderUnidentified[data.answerChoice] + 1;
                post.genderUnidentified[post.answers.length] = post.genderUnidentified[post.answers.length] + 1;
                post.markModified('genderUnidentified');
                demographics[0] = 'genderUnidentified';
              } // end gender demographic
              
              // handles age demographic updating
              if (data.checkboxData.hasOwnProperty('demographicAge') && data.checkboxData['demographicAge']) {
                switch (user.age) {
                  case 'age_13_14':
                    post.age_13_14[data.answerChoice] = post.age_13_14[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_13_14[post.answers.length] = post.age_13_14[post.answers.length] + 1; // updates count for total
                    post.markModified('age_13_14');
                    demographics[1] = 'age_13_14';
                    break;
                  case 'age_15_18':
                    post.age_15_18[data.answerChoice] = post.age_15_18[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_15_18[post.answers.length] = post.age_15_18[post.answers.length] + 1; // updates count for total
                    post.markModified('age_15_18');
                    demographics[1] = 'age_15_18';
                    break;
                  case 'age_19_21':
                    post.age_19_21[data.answerChoice] = post.age_19_21[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_19_21[post.answers.length] = post.age_19_21[post.answers.length] + 1; // updates count for total
                    post.markModified('age_19_21');
                    demographics[1] = 'age_19_21';
                    break;
                  case 'age_22_25':
                    post.age_22_25[data.answerChoice] = post.age_22_25[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_22_25[post.answers.length] = post.age_22_25[post.answers.length] + 1; // updates count for total
                    post.markModified('age_22_25');
                    demographics[1] = 'age_22_25';
                    break;
                  case 'age_26_29':
                    post.age_26_29[data.answerChoice] = post.age_26_29[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_26_29[post.answers.length] = post.age_26_29[post.answers.length] + 1; // updates count for total
                    post.markModified('age_26_29');
                    demographics[1] = 'age_26_29';
                    break;
                  case 'age_30_34':
                    post.age_30_34[data.answerChoice] = post.age_30_34[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_30_34[post.answers.length] = post.age_30_34[post.answers.length] + 1; // updates count for total
                    post.markModified('age_30_34');
                    demographics[1] = 'age_30_34';
                    break;
                  case 'age_35_39':
                    post.age_35_39[data.answerChoice] = post.age_35_39[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_35_39[post.answers.length] = post.age_35_39[post.answers.length] + 1; // updates count for total
                    post.markModified('age_35_39');
                    demographics[1] = 'age_35_39';
                    break;
                  case 'age_40':
                    post.age_40[data.answerChoice] = post.age_40[data.answerChoice] + 1; // updates count for answer vote demo
                    post.age_40[post.answers.length] = post.age_40[post.answers.length] + 1; // updates count for total
                    post.markModified('age_40');
                    demographics[1] = 'age_40';
                    break;
                } // end switch
              } else {
                post.ageUnidentified[data.answerChoice] = post.ageUnidentified[data.answerChoice] + 1;
                post.ageUnidentified[post.answers.length] = post.ageUnidentified[post.answers.length] + 1;
                post.markModified('ageUnidentified');
                demographics[1] = 'ageUnidentified';
              } // end age demographic
  
              // handles education demographic updating
              if (data.checkboxData.hasOwnProperty('demographicEdu') && data.checkboxData['demographicEdu']) {
                switch (user.education) {
                  case 'eduMS':
                    post.eduMS[data.answerChoice] = post.eduMS[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduMS[post.answers.length] = post.eduMS[post.answers.length] + 1; // updates count for total
                    post.markModified('eduMS');
                    demographics[2] = 'eduMS';
                    break;
                  case 'eduHS':
                    post.eduHS[data.answerChoice] = post.eduHS[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduHS[post.answers.length] = post.eduHS[post.answers.length] + 1; // updates count for total
                    post.markModified('eduHS');
                    demographics[2] = 'eduHS';
                    break;
                  case 'eduAssociate':
                    post.eduAssociate[data.answerChoice] = post.eduAssociate[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduAssociate[post.answers.length] = post.eduAssociate[post.answers.length] + 1; // updates count for total
                    post.markModified('eduAssociate');
                    demographics[2] = 'eduAssociate';
                    break;
                  case 'eduBachelor':
                    post.eduBachelor[data.answerChoice] = post.eduBachelor[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduBachelor[post.answers.length] = post.eduBachelor[post.answers.length] + 1; // updates count for total
                    post.markModified('eduBachelor');
                    demographics[2] = 'eduBachelor';
                    break;
                  case 'eduMaster':
                    post.eduMaster[data.answerChoice] = post.eduMaster[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduMaster[post.answers.length] = post.eduMaster[post.answers.length] + 1; // updates count for total
                    post.markModified('eduMaster');
                    demographics[2] = 'eduMaster';
                    break;
                  case 'eduPostgrad':
                    post.eduPostgrad[data.answerChoice] = post.eduPostgrad[data.answerChoice] + 1; // updates count for answer vote demo
                    post.eduPostgrad[post.answers.length] = post.eduPostgrad[post.answers.length] + 1; // updates count for total
                    post.markModified('eduPostgrad');
                    demographics[2] = 'eduPostgrad';
                    break;
                } // end switch
              } else {
                post.eduUnidentified[data.answerChoice] = post.eduUnidentified[data.answerChoice] + 1;
                post.eduUnidentified[post.answers.length] = post.eduUnidentified[post.answers.length] + 1;
                post.markModified('eduUnidentified');
                demographics[2] = 'eduUnidentified';
              } // end education demographic
            
              // handles income demographic updating
              if (data.checkboxData.hasOwnProperty('demographicInc') && data.checkboxData['demographicInc']) {
                switch (user.income) {
                  case 'incomeLowerMiddle':
                    post.incomeLowerMiddle[data.answerChoice] = post.incomeLowerMiddle[data.answerChoice] + 1; // updates count for answer vote demo
                    post.incomeLowerMiddle[post.answers.length] = post.incomeLowerMiddle[post.answers.length] + 1; // updates count for total
                    post.markModified('incomeLowerMiddle');
                    demographics[3] = 'incomeLowerMiddle';
                    break;
                  case 'incomeMiddleMiddle':
                    post.incomeMiddleMiddle[data.answerChoice] = post.incomeMiddleMiddle[data.answerChoice] + 1; // updates count for answer vote demo
                    post.incomeMiddleMiddle[post.answers.length] = post.incomeMiddleMiddle[post.answers.length] + 1; // updates count for total
                    post.markModified('incomeMiddleMiddle');
                    demographics[3] = 'incomeMiddleMiddle';
                    break;
                  case 'incomeUpperMiddle1':
                    post.incomeUpperMiddle1[data.answerChoice] = post.incomeUpperMiddle1[data.answerChoice] + 1; // updates count for answer vote demo
                    post.incomeUpperMiddle1[post.answers.length] = post.incomeUpperMiddle1[post.answers.length] + 1; // updates count for total
                    post.markModified('incomeUpperMiddle1');
                    demographics[3] = 'incomeUpperMiddle1';
                    break;
                  case 'incomeUpperMiddle2':
                    post.incomeUpperMiddle2[data.answerChoice] = post.incomeUpperMiddle2[data.answerChoice] + 1; // updates count for answer vote demo
                    post.incomeUpperMiddle2[post.answers.length] = post.incomeUpperMiddle2[post.answers.length] + 1; // updates count for total
                    post.markModified('incomeUpperMiddle2');
                    demographics[3] = 'incomeUpperMiddle2';
                    break;
                  case 'incomeUpper':
                    post.incomeUpper[data.answerChoice] = post.incomeUpper[data.answerChoice] + 1; // updates count for answer vote demo
                    post.incomeUpper[post.answers.length] = post.incomeUpper[post.answers.length] + 1; // updates count for total
                    post.markModified('incomeUpper');
                    demographics[3] = 'incomeUpper';
                    break;
                } // end switch
              } else {
                post.incomeUnidentified[data.answerChoice] = post.incomeUnidentified[data.answerChoice] + 1;
                post.incomeUnidentified[post.answers.length] = post.incomeUnidentified[post.answers.length] + 1;
                post.markModified('incomeUnidentified');
                demographics[3] = 'incomeUnidentified';
              } // end income demographic

              // Add country to post - TODO DEV ENV TESTED but not production env
              var country_obj = country.lookupSync(clientIP);
              if (country_obj == null) { // this shouldn't fire either
                console.log('IPv4 geolocation for '.red + user.username.red + ' failed - invalid public IPv4 address.'.red);
                demographics[4] = null;
              }
              else { // add country
                var countryName = country_obj.country_name;
                var newCountry = false; // is the country new? (true if country doesn't already exist in country list)
                demographics[4] = countryName;
                for (p = 0; p < post.countries.length; p++) {
                  var countryList = resources.parseKeys(post.countries[p]);
                  if (countryList.indexOf(countryName) == -1) { // check if country already exists in country list
                    var json = {}; 
                    if (p == data.answerChoice || p == post.countries.length-1) // if p is the answer choice or all
                      json[countryName] = 1;
                    else
                      json[countryName] = 0;
                    newCountry = true;
                    post.countries[p].push(json);
                    delete json;
                  } // end if
                } // end for
                if (!newCountry)
                  post.countries[data.answerChoice][countryList.indexOf(countryName)][countryName] = post.countries[data.answerChoice][countryList.indexOf(countryName)][countryName] + 1;
                post.markModified('countries');
                delete countryList;
              } // end else

              for (ans in post.answers[data.answerChoice]) // increments answer choice
                post.answers[data.answerChoice][ans] += 1;
              post.markModified('answers');

              // update user info
              user.numQuestionsAnswered = user.numQuestionsAnswered + 1; // increment num questions answered by user
              user.questionsAnswered.push(data.postid);
              user.markModified('questionsAnswered');

              // converts client IP to latlng then updates db and sends to clients
              IPToLocation.getLatLong(clientIP, function(latlng) {
                if (data.checkboxData.demographicLoc && latlng != null) { // only adds latlng location if client requests so and if latlng isn't null
                  var latlngarray = []; latlngarray[0] = latlng.lat; latlngarray[1] = latlng.lng;
                  post.locations[data.answerChoice].push(latlngarray); // adds to answer specific latlng locations
                  post.locations[post.locations.length-1].push(latlngarray); // adds to total latlng locations
                  post.markModified('locations');
                  demographics[5] = latlngarray;
                } else {
                  demographics[5] = null;
                } // end if-else
            
                user.save(function(err) { if (err) throw err; });
                post.save(function(err) { if (err) throw err; });
                console.log('Answer submission from '.green + user.username.green + ' validated.'.green);

                // updates post score and position in Redis postlists
                resources.calcPostScore(post, function() {});

                // emits
                socket.emit('answerRender', { postid : post._id }); // send info for reactive answer button only to logged in user
                io.emit('answer', { postid : post._id, demographics : demographics, answerChoice : data.answerChoice }); // send to everyone including client that voted
              }); // end IPToLocation callback
            
            } // end checkboxData type check
            else // this shouldn't ever fire if client is using web app as intended
              console.log('Answer submission by '.red + user.username.red + ' rejected - checkboxData is not a valid object.'.red);
          } // end already answered if 
          else // this shouldn't ever fire if client is using web app as intended
            console.log('Answer submission by '.red + user.username.red + ' rejected - question already answered.'.red);
        } // end answer choice if
        else // this shouldn't ever fire if client is using web app as intended
          console.log('Answer submission by '.red + user.username.red + ' rejected - invalid answer choice index.'.red);
      } // end postid not valid if
      else // this shouldn't ever fire if client is using web app as intended
        console.log('Answer submission by '.red + user.username.red + ' rejected - invalid post id.'.red);
    }); // end post query
  }); // end answer modal form handler

  // retrieves and sends back more questions in question list if they exist
  socket.on('showMoreQuestions', function(data) {
    var user = socket.request.user;
    console.log('Show more submitted questions request by ' + user.username + '.'); // TODO logging in case of spam
    User.findOne({ username : data.username }, function(err, profileUser) {
      if (profileUser != null) {
        resources.getQuestionList(profileUser, data.index, function(submittedQuestions) {
          if (user.logged_in)
            console.log('Show more submitted questions request of '.green + profileUser.username.green + ' by '.green + user.username.green + ' validated.'.green);
          else
            console.log('Show more submitted questions request of '.green + profileUser.username.green + ' by '.green + user.green + ' validated.'.green);
          socket.emit('addToQuestionList', { submittedQuestions : submittedQuestions });
        }); // end getQuestionList
      } else { // this shouldn't ever fire if client is using web app as intended
        if (user.logged_in)
          console.log('Show more submitted questions request by '.red + user.username.red + ' rejected - profile user does not exist.'.red);
        else
          console.log('Show more submitted questions request by '.red + user.red + ' rejected - profile user does not exist.'.red);
      } // end if-else      
    }); // end user query
  }); // end showMoreQuestions listener

  // save demographics handler - validates and saves changes to user's demographic information - also prevents editing demographic information for 10 min
  socket.on('saveDemographics', function(data) {
    var user = socket.request.user;
    console.log('Save demographics request by ' + user.username + '.');
    if (user.logged_in) { // only runs if user isn't on demographic waitlist
      if (editDemographicsUserWaitlist[user.username] == undefined) {
        editDemographicsUserWaitlist[user.username] = Date.now(); // value of the user in waitlist is the time that user was entered into waitlist
        console.log(user.username.yellow + ' added to edit demographic waitlist.'.yellow);
        setTimeout(function () {
          console.log(user.username.green + ' removed from edit demographic waitlist.'.green);
          delete editDemographicsUserWaitlist[user.username];
        }, 1800000, user.username); // 30 minute timer

        var demoMapping = []; // reverse demographic mapping to db values (0-age, 1-edu, 2-income)
        
        switch (data.age) {
          case '13-14':
            demoMapping[0] = 'age_13_14';
            break;
          case '15-18':
            demoMapping[0] = 'age_15_18';
            break;
          case '19-21':
            demoMapping[0] = 'age_19_21';
            break;
          case '22-25':
            demoMapping[0] = 'age_22_25';
            break;
          case '26-29':
            demoMapping[0] = 'age_26_29';
            break;
          case '30-34':
            demoMapping[0] = 'age_30_34';
            break;
          case '35-39':
            demoMapping[0] = 'age_35_39';
            break;
          case '40+':
            demoMapping[0] = 'age_40';
            break;
          default:
            demoMapping[0] = 'Unidentified';
        } // end age switch

        switch (data.education) {
          case 'Middle (Primary) School':
            demoMapping[1] = 'eduMS';
            break;
          case 'High (Secondary) School':
            demoMapping[1] = 'eduHS';
            break;
          case 'Associate Degree':
            demoMapping[1] = 'eduAssociate';
            break;
          case 'Bachelor Degree':
            demoMapping[1] = 'eduBachelor';
            break;
          case 'Master Degree':
            demoMapping[1] = 'eduMaster';
            break;
          case 'Postgraduate':
            demoMapping[1] = 'eduPostgrad';
            break;
          default:
            demoMapping[1] = 'Unidentified';
        } // end education switch

        switch (data.income) {
          case 'Lower Middle Class':
            demoMapping[2] = 'incomeLowerMiddle';
            break;
          case '"Middle" Middle Class':
            demoMapping[2] = 'incomeMiddleMiddle';
            break;
          case 'Upper Middle Class Tier 1':
            demoMapping[2] = 'incomeUpperMiddle1';
            break;
          case 'Upper Middle Class Tier 2':
            demoMapping[2] = 'incomeUpperMiddle2';
            break;
          case 'Upper Class':
            demoMapping[2] = 'incomeUpper';
            break;
          default:
            demoMapping[2] = 'Unidentified';
        } // end income switch

        if (user.gender != data.gender)
          user.gender = data.gender;
        if (user.age != demoMapping[0])
          user.age = demoMapping[0];
        if (user.education != demoMapping[1])
          user.education = demoMapping[1];
        if (user.income != demoMapping[2])
          user.income = demoMapping[2];

        user.save(function(err) { if (err) throw err; });

        console.log('Save demographics request by '.green + user.username.green + ' validated.'.green);
        socket.emit('updateDemographics', { gender : data.gender, ageTable : resources.demographicsMapping(demoMapping[0], 'table'), educationTable : resources.demographicsMapping(demoMapping[1], 'table'), incomeTable : resources.demographicsMapping(demoMapping[2], 'table'), ageDropdown : data.age, educationDropdown : data.education, incomeDropdown : data.income });
      } else { // notify user that user is still on demographic waitlist
        socket.emit('demographicWaitlist', { timeRemaining : Math.ceil((1800000 - (Date.now()-editDemographicsUserWaitlist[user.username]))/60000) });
      } // end if-else
    } else { // this shouldn't ever fire if client is using web app as intended
      console.log('Save demographics request by '.red + user.red + ' rejected - user not logged in.'.red);
    }// end if-else
  }); // end save demographics handler

  socket.on('disconnect', function() {
    console.log('User disconnected at IPv4: ' + clientIP);
  });

}); // end connection master listener

/*client.zrevrange("set", 0, -1, function(err, res) {
  console.log(res);
});*/

/* Updates Redis list of posts 
Postlist.findOne({ community : 'Main' }, function(err, postlist) {
  for (var c = 0; c < postlist.newlist.length-5; c++) {
    Post.findOne({ _id : postlist.newlist[c] }, function(err, post) {
      resources.calcPostScore(post, function() {} );
    });
  }
});
*/

/* Remove from sorted set Redis 
Post.findOne({ question : 'Which burger joint is the best?' }, function (err, post) {
  console.log(post._id);
  //client.zrem("hotlistFood", post._id);
});
*/

/*
client.zrevrange("hotlistMain", 0, 4, function(err, res) { // first 5 
  console.log(res);
});
*/

/*
var args = [ 'myzset', 1, 'one', 2, 'two', 3, 'three', 99, 'ninety-nine' ]
client.zadd(args, function (err, response) {
    if (err) throw err;
    console.log('added '+response+' items.');

    // -Infinity and +Infinity also work
    var args1 = [ 'myzset', '+inf', '-inf' ];
    client.zrevrangebyscore(args1, function (err, response) {
        if (err) throw err;
        console.log('example1', response);
        // write your code here
    });

    var max = 3, min = 1, offset = 1, count = 2;
    var args2 = [ 'myzset', max, min, 'WITHSCORES', 'LIMIT', offset, count ];
    client.zrevrangebyscore(args2, function (err, response) {
        if (err) throw err;
        console.log('example2', response);
        // write your code here
    });
});
*/

module.exports = app;
