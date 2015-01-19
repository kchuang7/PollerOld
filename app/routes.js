// routes.js

/* Session variables
 * page - current page the client is on (tentatively used regardless of community and post list
 * morePages - boolean for whether or not there are older pages available
 * loggedIn - boolean for whether or not the client is logged in - ONLY used for CLIENT side logic
*/

var User = require('../app/models/user');
var Post = require('../app/models/post');
var Postlist = require('../app/models/postlist');
var resources = require('../app/resources');

var async = require('async');
var sanitizer = require('sanitizer');

module.exports = function(app, passport) {

  /* GET home page. */
  app.get('/', function(req, res) {
    renderPage(req, res, 'Main', 1, 'hotlist');
  }); // end home GET

  /* GET Hot page (just the home page). */
  app.get('/hot', function(req, res) {
    res.redirect('/');
  });
  
  /* GET Main community "Hot" page number request. */
  app.get('/:page(\\d+)', function(req, res) {
    renderPage(req, res, 'Main', parseInt(req.params.page), 'hotlist');
  }); // end "Hot" page number request

  /* GET Main community "New" page. */
  app.get('/new', function(req, res) {
    renderPage(req, res, 'Main', 1, 'newlist');
  });

  /* GET Main community "New" page number request. */
  app.get('/new/:page(\\d+)', function(req, res) {
    renderPage(req, res, 'Main', parseInt(req.params.page), 'newlist');
  }); // end "New" page number request
  
  /* GET Main community "Top" page. */
  app.get('/top', function(req, res) {
    renderPage(req, res, 'Main', 1, 'toplist');
  });

  /* GET Main community "Top" page number request. */
  app.get('/top/:page(\\d+)', function(req, res) {
    renderPage(req, res, 'Main', parseInt(req.params.page), 'toplist');
  }); // end "New" page number request

  /* GET arbitrary community "Hot" page */
  app.get('/c/:community', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, 1, 'hotlist');
      }
    });
  }); // end arbitrary community "Hot" page

  /* GET community Ask page. */
  app.get('/c/:community/ask', function(req, res) {
    isLoggedIn2(req, res, function() { // only runs ask page if user is logged in, otherwise redirects to home page
      req.session.loggedIn = false; // assume user not logged in
      isLoggedIn(req, res, function() { // check login status
        req.session.loggedIn = true;
        /* export req.user */ module.exports.userid = req.user._id;
      });
      module.exports.finishedExport = false;
      var username = null;
      if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
        username = req.user.username;
      Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
        var communitiesArray = []
        for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
          communitiesArray.push(postlists[z].community);
        var community = req.params.community.toLowerCase();
        community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
        Postlist.findOne({ community : community }, function(err, postlist) {
          if (postlist == null) {
            res.status(404);
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });    
          } else {
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.render('ask', { username : username, community : community, communityList : communitiesArray, loggedIn : req.session.loggedIn, url : req.url });
          } // end if-else
        }); // end individual postlist community query
      }); // end postlist communities query
    }); // end user logged in check
  }); // end community specific ask page
  
  /* POST Ask page. */
  app.post('/c/:community/ask', function(req, res) {
    isLoggedIn2(req, res, function() { // only runs ask post request if user is logged in, otherwise redirects to home page
      var formInputs = []; // will contain sanitized form input values
      var c = 0; // counter for array
      for (field in req.body) { // escapes and sanitizes form input values
        formInputs[c] = sanitizer.sanitize(sanitizer.escape(req.body[field]));
        c++;
      } // end for
    
      // create a post DB document from the user's inputs
      var newPost = new Post();
      var community = req.params.community.toLowerCase();
      community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query

      // gets the user's mongoose db object
      User.findOne({ _id : req.session.passport.user }, function (err, user) {
      
        newPost._user = user;
        newPost.community = community;
        newPost.question = formInputs[0];
        // initializes the answers array
        newPost.answers = [];
        for (var i = 1; i < formInputs.length; i++) {
          var json = {}; json[formInputs[i]] = 0;
          newPost.answers[i-1] = json;
        } // end for
        newPost.upvotes = 0; newPost.downvotes = 0; newPost.score = 0;
        var zeroesArray = []; // contains array of zeroes the size of numAns+1 for the demographics variables
        for (var i = 0; i < formInputs.length; i++)
          zeroesArray[i] = 0;
        newPost.genderUnidentified = zeroesArray;
        newPost.genderMale = zeroesArray;
        newPost.genderFemale = zeroesArray;
        newPost.ageUnidentified = zeroesArray;
        newPost.age_13_14 = zeroesArray;
        newPost.age_15_18 = zeroesArray;
        newPost.age_19_21 = zeroesArray;
        newPost.age_22_25 = zeroesArray;
        newPost.age_26_29 = zeroesArray;
        newPost.age_30_34 = zeroesArray;
        newPost.age_35_39 = zeroesArray;
        newPost.age_40 = zeroesArray;
        newPost.eduUnidentified = zeroesArray;
        newPost.eduMS = zeroesArray;
        newPost.eduHS = zeroesArray;
        newPost.eduAssociate = zeroesArray;
        newPost.eduBachelor = zeroesArray;
        newPost.eduMaster = zeroesArray;
        newPost.eduPostgrad = zeroesArray;
        newPost.incomeUnidentified = zeroesArray;
        newPost.incomeLowerMiddle = zeroesArray;
        newPost.incomeMiddleMiddle = zeroesArray;
        newPost.incomeUpperMiddle1 = zeroesArray; 
        newPost.incomeUpperMiddle2 = zeroesArray;
        newPost.incomeUpper = zeroesArray;
        newPost.locations = []; // locations is an array of arrays of which have latlngs stored in them
        newPost.countries = []; // countries is an array of arrays of which have JSON representations of the country mapped to the number of votes from there
        for (var i = 0; i < formInputs.length; i++) {
          newPost.locations[i] = [];
          newPost.countries[i] = [];
        } // end for

        // saves the new post into MongoDB
        newPost.save(function(err) { if (err) throw err; });

        user.numQuestionsAsked = user.numQuestionsAsked+1;
        user.postIds[user.postIds.length] = newPost._id;
        user.markModified('postIds');

        // updates post information for user that asked the question
        user.save(function(err) { if (err) throw err; });
      
        Postlist.findOne({ community : community }, function (err, commpostlist) {
          Postlist.findOne({ community : 'Main' }, function (err, mainpostlist) {
            commpostlist.newlist.unshift(newPost._id);
            commpostlist.numPosts = commpostlist.numPosts+1;
            mainpostlist.newlist.unshift(newPost._id);
            mainpostlist.numPosts = mainpostlist.numPosts+1;
            commpostlist.save(function(err) { if (err) throw err; });
            mainpostlist.save(function(err) { if (err) throw err; });
            resources.calcPostScore(newPost, function() {
              // redirects to the new postlist of that community
              res.redirect('/c/' + req.params.community + '/new');
            });
          }); // end Main postlist query
        }); // end community postlist query
      }); // end user query
    }); // end user logged in check
  }); // end community specific ask page POST

  /* GET arbitrary community Hot page (just the community home page). */
  app.get('/c/:community/hot', function(req, res) {
    res.redirect('/c/' + req.params.community);
  });

  /* GET arbitrary community "Hot" page number request. */
  app.get('/c/:community/:page(\\d+)', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, parseInt(req.params.page), 'hotlist');
      }
    });
  }); // end arbitrary community "Hot" page number request

  /* GET arbitrary community "New" page */
  app.get('/c/:community/new', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, 1, 'newlist');
      }
    });
  }); // end arbitrary community "New" page

  /* GET arbitrary community "New" page number request. */
  app.get('/c/:community/new/:page(\\d+)', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, parseInt(req.params.page), 'newlist');
      }
    });
  }); // end arbitrary community "New" page number request

  /* GET arbitrary community "Top" page */
  app.get('/c/:community/top', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, 1, 'toplist');
      }
    });
  }); // end arbitrary community "Top" page

  /* GET arbitrary community "Top" page number request. */
  app.get('/c/:community/top/:page(\\d+)', function(req, res) {
    var community = req.params.community.toLowerCase();
    community = community.charAt(0).toUpperCase() + community.slice(1); // converts community string into first letter capital, rest lowercase for db query
    Postlist.findOne({ community : community }, function(err, postlist) {
      if (postlist == null) {
        req.session.loggedIn = false; // assume user not logged in
        isLoggedIn(req, res, function() { // check login status
          req.session.loggedIn = true;
          /* export req.user */ module.exports.userid = req.user._id;
        });
        module.exports.finishedExport = false;
        var username = null;
        if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
          username = req.user.username;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
        return;
      } else {
        renderPage(req, res, community, parseInt(req.params.page), 'toplist');
      }
    });
  }); // end arbitrary community "Top" page number request

  /* GET Post page. */
  app.get('/post/:id/:parsedQuestion', function(req, res) {
    var pageDoesNotExist = false; // prevents regular page from rendering/sending headers if 404 is invoked
    req.session.loggedIn = false; // assume user not logged in
    isLoggedIn(req, res, function() { // check login status
      req.session.loggedIn = true;
      /* export req.user */ module.exports.userid = req.user._id;
    });
    var username = null, gender = null, age = null, education = null, income = null;
    if (req.session.loggedIn) { // fetches username and demographics if client is logged in (as opposed to sending the entirety of their account info)
      username = req.user.username;
      gender = req.user.gender;
      age = req.user.age;
      education = req.user.education;
      income = req.user.income;
    } // end if
    
    Post.findOne({ _shortid : req.params.id }, function(err, post) {
      if (post != null) { // checks if id in url is valid
        var upvoted = false, downvoted = false, questionAnswered = false, countries, numCountries;
        if (req.session.loggedIn) { // checks if req.user even contains a logged in user
          if (req.user.upvotedPosts.indexOf(post._id) > -1) // upvoted before?
            upvoted = true;
          if (req.user.downvotedPosts.indexOf(post._id) > -1) // downvoted before?
            downvoted = true;
          if (req.user.questionsAnswered.indexOf(post._id) > -1) // answered before?
            questionAnswered = true;
        } // end if
        var temp = []; // for transferring arrays in countries to array to be sent to client
        for (j = 0; j < post.countries.length; j++)
          temp[j] = resources.parseValues(post.countries[j]);
        countries = resources.parseKeys(post.countries[0]);
        numCountries = temp;
        delete temp;
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          User.findOne({ _id : post._user }, function(err, postUser) {
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.render('post', { 
              letters : resources.letterArray,
              ansColors : resources.answerColors,
              question : post.question,
              answerChoices : resources.parseKeys(post.answers),
              answerVotes : resources.parseValues(post.answers),
              upvotes : post.upvotes,
              downvotes : post.downvotes,
              score : post.score,
              upvoted : upvoted,
              downvoted : downvoted,
              questionAnswered : questionAnswered,
              genderUnidentified : post.genderUnidentified,
              genderMale : post.genderMale,
              genderFemale : post.genderFemale,
              ageUnidentified : post.ageUnidentified,
              age_40 : post.age_40,
              age_35_39 : post.age_35_39,
              age_30_34 : post.age_30_34,
              age_26_29 : post.age_26_29,
              age_22_25 : post.age_22_25,
              age_19_21 : post.age_19_21, 
              age_15_18 : post.age_15_18,
              age_13_14 : post.age_13_14,
              eduUnidentified : post.eduUnidentified,
              eduPostgrad : post.eduPostgrad,
              eduMaster : post.eduMaster,
              eduBachelor : post.eduBachelor,
              eduAssociate : post.eduAssociate,
              eduHS : post.eduHS,
              eduMS : post.eduMS,
              incomeUnidentified : post.incomeUnidentified,
              incomeUpper : post.incomeUpper,
              incomeUpperMiddle2 : post.incomeUpperMiddle2,
              incomeUpperMiddle1 : post.incomeUpperMiddle1,
              incomeMiddleMiddle : post.incomeMiddleMiddle,
              incomeLowerMiddle : post.incomeLowerMiddle,
              countries : countries,
              numCountries : numCountries,
              locations : post.locations,
              community : post.community,
              numComments : post.numComments,
              created : (Date.now()-post.created)/1000,
              gender : gender,
              age : age,
              education : education,
              income : income,
              communityList : communitiesArray,
              id : post._id,
              shortId : post._shortid,
              postUser : postUser.username,
              loggedIn : req.session.loggedIn,
              username : username,
              url : req.url
            }); // end res render
          }); // end post user query
        }); // end postlist communities query
      } // end valid postid if
      else { // throws 404 page for post not found
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {        
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : 'Post does not exist.', community : null, communityList : communitiesArray, url : req.url });
        }); // end postlist communities query
      } // end 404 page not found
    }); // end post query
  }); // end post page

  /* GET Profile page. */
  app.get('/profile/:username', function(req, res) {
    var profileUsername = req.params.username; // username of profile
    req.session.loggedIn = false; // assume user not logged in
    isLoggedIn(req, res, function() { // check login status
      req.session.loggedIn = true;
      /* export req.user */ module.exports.userid = req.user._id;
    });
    module.exports.finishedExport = false;
    User.findOne({ username_lower : profileUsername.toLowerCase() }, function(err, user) { // user is the profile's user, whereas req.user refers to the logged in user (if one is logged in)
      var username = null;
      if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
        username = req.user.username;
      if (user == null) { // returns 404 if user profile does not exist
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('404', { username : username, loggedIn : req.session.loggedIn, message : profileUsername + ' profile does not exist.', community : null, communityList : communitiesArray, url : req.url });
          return;
        }); // end postlist communities query
      } else {
        var sameUser = false;
        if (req.session.loggedIn)
          sameUser = req.user.username == user.username; // checks if the profile page corresponds with the logged in user
        var demographics = [null, null, null, null]; // 0-gender, 1-age, 2-education, 3-income (indices 4-6 are same but for dropdown)
        if (sameUser) {
          demographics[0] = req.user.gender; // gender doesn't need mapping as values are self-explanatory
          demographics[1] = resources.demographicsMapping(req.user.age, 'table');
          demographics[2] = resources.demographicsMapping(req.user.education, 'table');
          demographics[3] = resources.demographicsMapping(req.user.income, 'table');
          demographics[4] = resources.demographicsMapping(req.user.age, 'dropdown');
          demographics[5] = resources.demographicsMapping(req.user.education, 'dropdown');
          demographics[6] = resources.demographicsMapping(req.user.income, 'dropdown');
        } // end if
        var dateOnly = String(user.created).substr(4, 11); // date that profile user joined
        resources.getQuestionList(user, 1, function(submittedQuestions, noSubmittedQuestions) {
          var moreThanFiveQuestions = false;
          if (user.postIds.length > 5)
            moreThanFiveQuestions = true;
          Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
            var communitiesArray = []
            for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
              communitiesArray.push(postlists[z].community);
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
            res.render('profile', { 
              profileUsername : user.username,
              dateJoined : dateOnly,
              postScore : user.postScore,
              numQuestionsAsked : user.numQuestionsAsked,
              numQuestionsAnswered : user.numQuestionsAnswered,
              numQuestionsUpvoted : user.upvotedPosts.length,
              numQuestionsDownvoted : user.downvotedPosts.length,
              submittedQuestions : submittedQuestions,
              moreThanFiveQuestions : moreThanFiveQuestions,
              noSubmittedQuestions : noSubmittedQuestions,
              communityList : communitiesArray,
              demographics : demographics,
              sameUser : sameUser,
              loggedIn : req.session.loggedIn,
              username : username,
              url : req.url
            }); // end res render
          }); // end postlist community query
        }); // end getQuestionList callback
      } // end else
    }); // end user query
  }); // end profile page

  /* GET Login page. */
  app.get('/login', function(req, res) {
    isNotLoggedIn(req, res, function() { // only brings to login page if user is not logged in, otherwise redirects to home page
      res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
      res.render('login', { message: req.flash('loginMessage') });
    });
  });

  /* GET Signup page. */
  app.get('/signup', function(req, res) {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.render('signup', { message: req.flash('signupMessage') } );
  });

  /* POST Login page. */
  app.post('/login', passport.authenticate('local-login', { failureRedirect: '/login', failureFlash: true }), function(req, res) {
    res.redirect('/profile/'+req.user.username);
  });

  /* POST Signup page. */
  app.post('/signup', passport.authenticate('local-signup', { failureRedirect: '/signup', failureFlash: true }), function(req, res) {
    res.redirect('/profile/'+req.user.username);
  });

  /* GET Logout page. */
  app.get('/logout', function(req, res) {
    isLoggedIn2(req, res, function() { // only runs logout if user is logged in, otherwise redirects to home page
      module.exports.isLoggedIn = false;
      /* export req.user */ module.exports.userid = undefined;
      module.exports.finishedExport = false;
      delete app.connectedUsers[req.user._id]; // removes the user from connected user list in server
      req.logout();
      res.redirect('/');
    });
  });
    
  /* Get About page. */
  app.get('/about', function(req, res) {
    req.session.loggedIn = false; // assume user not logged in
    isLoggedIn(req, res, function() { // check login status
      req.session.loggedIn = true;
      /* export req.user */ module.exports.userid = req.user._id;
    });
    module.exports.finishedExport = false;
    var username = null;
    if (req.session.loggedIn) // fetches username if client is logged in (as opposed to sending the entirety of their account info)
      username = req.user.username;
    Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
      var communitiesArray = []
      for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
        communitiesArray.push(postlists[z].community);
      res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
      res.render('about', { username : username, communityList : communitiesArray, loggedIn : req.session.loggedIn, url : req.url });
    }); // end postlist community query
  }); // end about page

  // renders a page with up to 5 question posts from any page of any community or post list
  function renderPage (req, res, community, page, list) {
    var pageDoesNotExist = false; // prevents regular page from rendering/sending headers if 404 is invoked
    req.session.page = page; // sets page request
    req.session.loggedIn = false; // assume user not logged in
    isLoggedIn(req, res, function() { // check login status
      req.session.loggedIn = true;
      /* export req.user */ module.exports.userid = req.user._id;
    });
    var username = null, gender = null, age = null, education = null, income = null;
    if (req.session.loggedIn) { // fetches username if client is logged in (as opposed to sending the entirety of their account info)
      username = req.user.username;
      gender = req.user.gender;
      age = req.user.age;
      education = req.user.education;
      income = req.user.income;
    } // end if
    // TODO will the following execute too late?
    Postlist.findOne({ 'community' : community }, function(err, postlist) {
      if (Math.ceil((postlist['newlist'].length-5)/5) < page) { // handles request for non-existent page
        Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
          var communitiesArray = []
          for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
            communitiesArray.push(postlists[z].community);
          res.status(404);
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          if (page == 1)
            res.render('404', { username : username, loggedIn : req.session.loggedIn, message : community + ' community does not have any posts yet! Ask a question above!', community : community, communityList : communitiesArray, url : req.url });
          else
            res.render('404', { username : username, loggedIn : req.session.loggedIn, message : 'Page ' + page + ' of ' + community + ' community does not exist.', community : community, communityList : communitiesArray, url : req.url });
          pageDoesNotExist = true;
        }); // end postlist communities query
      } // end non-existent page if
      if (Math.ceil((postlist['newlist'].length-5)/5) <= page) // are there more pages beyond this page with older posts?
        req.session.morePages = false;
      else
        req.session.morePages = true;
    });
    module.exports.community = community; // export community
    module.exports.page = req.session.page; // export page to server for proper chart loading
    module.exports.list = list; // export list
    module.exports.url = req.url; // export request url
    module.exports.finishedExport = true; // tells server.js that exporting of crucial data is done 

    resources.getPostUser(community, page, list, function(results) {
      // data to be sent to client, assuming all are null to begin with
      var userArray = [], scoreArray = [], questionArray = [], answerChoicesArray = [], answerVotesArray = [], upvotes = [], downvotes = [], upvotedArray = [], downvotedArray = [], questionsAnsweredArray = [], locationsArray = [] /* only contains initial data for loading */, len, temp /* used for locationsArray */, createdArray = [], numCommentsArray = [], shortIdArray = [];
      for (i = 0; i < 5; i++) {
        var postuser = results[i];
        if (postuser == null)
          break;
        // second index: 0 is post JSON object, 1 is user JSON object
        userArray[i] = postuser[1].username;
        scoreArray[i] = postuser[0].score;
        questionArray[i] = postuser[0].question;
        answerChoicesArray[i] = resources.parseKeys(postuser[0].answers);
        answerVotesArray[i] = resources.parseValues(postuser[0].answers);
        upvotes[i] = postuser[0].upvotes;
        downvotes[i] = postuser[0].downvotes;
        // builds a custom array of location coordinates to facilitate reading in ejs and index.ejs JS
        len = postuser[0].locations.length;
        locationsArray[i] = []; // sets up as an array for pushing
        for (q = 0; q < postuser[0].locations[len-1].length; q++) {
          locationsArray[i].push(postuser[0].locations[len-1][q][0]);
          locationsArray[i].push(postuser[0].locations[len-1][q][1]);
        } // end for
        // createdArray[i] = moment(postuser[0].created).format('ll'); formatted
        createdArray[i] = (Date.now()-postuser[0].created)/1000;
        if (req.session.loggedIn) { // checks if req.user even contains a logged in user
          // loads upvoted and downvoted arrays
          if (req.user.upvotedPosts.indexOf(postuser[0]._id) == -1)
            upvotedArray[i] = false;
          else
            upvotedArray[i] = true;
          if (req.user.downvotedPosts.indexOf(postuser[0]._id) == -1)
            downvotedArray[i] = false;
          else
            downvotedArray[i] = true;
          // loads answeredQuestionsArray
          if (req.user.questionsAnswered.indexOf(postuser[0]._id) == -1)
            questionsAnsweredArray[i] = false;
          else
            questionsAnsweredArray[i] = true;
        } // end if
        numCommentsArray[i] = postuser[0].numComments;
        shortIdArray[i] = postuser[0]._shortid;
      } // end for
      Postlist.find().sort({numPosts: -1}).exec(function(err, postlists) {
        var communitiesArray = []
        for (z = 1; z < postlists.length; z++) // z start at 1 to skip Main community
          communitiesArray.push(postlists[z].community);
        if (!pageDoesNotExist) {
          res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
          res.render('index', {
            usernames : userArray,
            letters : resources.letterArray,
            ansColors : resources.answerColors,
            scores : scoreArray,
            questions : questionArray,
            answerChoices : answerChoicesArray,
            answerVotes : answerVotesArray,
            upvotes : upvotes,
            downvotes : downvotes,
            upvotedArray : upvotedArray,
            downvotedArray : downvotedArray,
            questionsAnsweredArray : questionsAnsweredArray,
            page : req.session.page,
            morePages: req.session.morePages,
            loggedIn : req.session.loggedIn,
            community : community,
            communityList : communitiesArray,
            list : list,
            username : username,
            gender : gender,
            age : age, 
            education : education,
            income : income,
            created : createdArray,
            locations : locationsArray, // this locations array only contains latlngs for "Show All"; the rest of the answer specific data points are loaded with socket.io inside clientData inside client.js
            numComments : numCommentsArray,
            shortId : shortIdArray,
            url : req.url
          }); // end res.render
        } // end if
      }); // end postlist community query
    }); // end getPostUser queries
  } // end renderPage

} // end router handlers
 
// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

  // if user is authenticated in the session, carry on 
  if (req.isAuthenticated())
    return next();

} // end isLoggedIn

// same as above, except with redirect (only used in logout)
function isLoggedIn2(req, res, next) {

  // if user is authenticated in the session, carry on 
  if (req.isAuthenticated())
    return next();
  
  res.redirect('/');
} // end isLoggedIn2

// route middleware to make sure a user is NOT logged in (opposite of above due to necessitated use case)
function isNotLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on 
  if (!req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/');
} // end isLoggedIn
