var async = require('async');
var User = require('../app/models/user');
var Post = require('../app/models/post');
var Postlist = require('../app/models/postlist');

var redis = require('redis');
var client = redis.createClient();

/* Front-end information resources */

var letterArray = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']; // for displaying answer choices

/* LimeGreen, Crimson, DodgerBlue, DarkOrange, Cyan, SaddleBrown, BlueViolet, MediumVioletRed */
var answerColors = ['#32CD32', '#DC143C', '#1E90FF', '#FF8C00', '#003399', '#8B4513', '#8A2BE2', '#C71585']; // 8 color palette for answer choices

module.exports.letterArray = letterArray;
module.exports.answerColors = answerColors;

// extracts answer choices from the DB json object into an array of Strings
var parseKeys = function(array) {
  var keys = [];
  for (x = 0; x < array.length; x++)
    for (y in array[x])
      keys[x] = y;
  return keys;
} // end parseKeys

// extracts answer votes from the DB json object into an array of numbers
var parseValues = function(array) {
  var values = [];
  for (x = 0; x < array.length; x++)
    for (y in array[x])
      values[x] = array[x][y];
  return values;
} // end parseValues

module.exports.parseKeys = parseKeys;
module.exports.parseValues = parseValues;

// maps the human readable definition of a demographic category based on the DB demographic key (excludes gender and all unidentifieds because that's self explanatory)
var demographicsMapping = function (demographicCategory, form) { // form: table or for use in modal dropdowns
  if (form == 'table') {
  switch (demographicCategory) {
    case 'Unidentified':
      return 'Unidentified';
    case 'age_13_14':
      return '13-14';
    case 'age_15_18':
      return '15-18';
    case 'age_19_21':
      return '19-21';
    case 'age_22_25':
      return '22-25';
    case 'age_26_29':
      return '26-29';
    case 'age_30_34':
      return '30-34';
    case 'age_35_39':
      return '35-39';
    case 'age_40':
      return '40+';
    case 'eduMS':
      return 'Middle (Primary) School (6-8 grade equivalent)';
    case 'eduHS':
      return 'High (Secondary) School (9-12 grade equivalent)';
    case 'eduAssociate':
      return 'Associate Degree (2 year undergrad equivalent)';
    case 'eduBachelor':
      return 'Bachelor Degree (4 year undergrad equivalent)';
    case 'eduMaster':
      return 'Master Degree (2 year graduate level equivalent)';
    case 'eduPostgrad':
      return 'Postgraduate/Ph.D./Doctorate';
    case 'incomeLowerMiddle':
      return 'Lower Middle Class ($23,050-$32,500 annual)';
    case 'incomeMiddleMiddle':
      return '"Middle" Middle Class ($32,500-$60,000 annual)';
    case 'incomeUpperMiddle1':
      return 'Upper Middle Class Tier 1 ($60,000-$100,000 annual)';
    case 'incomeUpperMiddle2':
      return 'Upper Middle Class Tier 2 (+$100k annual, top 33%)';
    case 'incomeUpper':
      return 'Upper Class (+$150k annual, top 5%)';
    default:
      return null;
  } // end switch
  } // end if
  if (form == 'dropdown') {
  switch (demographicCategory) {
    case 'Unidentified':
      return 'Unidentified';
    case 'age_13_14':
      return '13-14';
    case 'age_15_18':
      return '15-18';
    case 'age_19_21':
      return '19-21';
    case 'age_22_25':
      return '22-25';
    case 'age_26_29':
      return '26-29';
    case 'age_30_34':
      return '30-34';
    case 'age_35_39':
      return '35-39';
    case 'age_40':
      return '40+';
    case 'eduMS':
      return 'Middle (Primary) School';
    case 'eduHS':
      return 'High (Secondary) School';
    case 'eduAssociate':
      return 'Associate Degree';
    case 'eduBachelor':
      return 'Bachelor Degree';
    case 'eduMaster':
      return 'Master Degree';
    case 'eduPostgrad':
      return 'Postgraduate';
    case 'incomeLowerMiddle':
      return 'Lower Middle Class';
    case 'incomeMiddleMiddle':
      return '"Middle" Middle Class';
    case 'incomeUpperMiddle1':
      return 'Upper Middle Class Tier 1';
    case 'incomeUpperMiddle2':
      return 'Upper Middle Class Tier 2';
    case 'incomeUpper':
      return 'Upper Class';
    default:
      return null;
  } // end switch
  } // end if
} // end demographicsMapping

module.exports.demographicsMapping = demographicsMapping;

var getPostUser = function (community, page, list, callback) {
  Postlist.findOne({ "community" : community }, function(err, postlist) {
    var idArray = []; // contains ids of requested posts
    async.series([
      function(callback) {
        if (list === "hotlist"  || list === "toplist") {
          client.zrevrange(list + community, 5*(page-1), (page*5)-1, function(err, res) {
            for (var c = 0; c < res.length; c++)
              idArray.push(res[c])
            callback();
          });
        } else if (list == "newlist") {
          for (var c = 0; c < 5; c++)
            idArray.push(postlist[list][(5*(page-1))+c]);
          callback();
        } // end else-if
      }  // end series task (get post ids)
    ], function(errSeries) { // series callback
      if (errSeries) throw errSeries;
      // get top 5 array of posts and perform null checking
      async.parallel([
        function(callback){
          Post.findOne({ _id : idArray[0] }, function(err, post1) {
            if (post1 == null)
              callback(null, null);
            else {
              User.findOne({ _id: post1._user }, function(err, user1) {
                callback(null, post1, user1);
              });
            }
          });
        }, // end first post query
        function(callback){
          Post.findOne({ _id : idArray[1] }, function(err, post2) {
            if (post2 == null)
              callback(null, null);
            else {
              User.findOne({ _id: post2._user }, function(err, user2) {
                callback(null, post2, user2);
              });
            }
          });
        }, // end second post query
        function(callback){
          Post.findOne({ _id : idArray[2] }, function(err, post3) {
            if (post3 == null)
              callback(null, null);
            else {
              User.findOne({ _id: post3._user }, function(err, user3) {
                callback(null, post3, user3);
              });
            }
          });
        }, // end third post query
        function(callback){
          Post.findOne({ _id : idArray[3] }, function(err, post4) {
            if (post4 == null)
              callback(null, null);
            else {
              User.findOne({ _id: post4._user }, function(err, user4) {
                callback(null, post4, user4);
              });
            }
          });
        }, // end fourth post query
        function(callback){
          Post.findOne({ _id : idArray[4] }, function(err, post5) {
            if (post5 == null)
              callback(null, null);
            else {
              User.findOne({ _id: post5._user }, function(err, user5) {
                callback(null, post5, user5);
              });
            }
          });
        }, // end fifth post query
      ], function(err, results) {
        if (err) console.log(err);
        callback(results);
      });
    }); // end async parallel
  }); // end async series
} // end getPostUser

module.exports.getPostUser = getPostUser;

// query for question list to be used in profile page
var getQuestionList = function (user, factor /* 1-first five questions, 2-second five questions, etc. */, callback) {
  async.parallel([
    function(callback){
      Post.findOne({ _id : user.postIds[(5*(factor-1))] }, function(err, post1) {
        if (post1 == null)
          callback(null, null);
        else 
          callback(null, getQuestionListData(post1));
      });
    }, // end first post query
    function(callback){
      Post.findOne({ _id : user.postIds[(5*(factor-1))+1] }, function(err, post2) {
        if (post2 == null)
          callback(null, null);
        else
          callback(null, getQuestionListData(post2));
      });
    }, // end second post query
    function(callback){
      Post.findOne({ _id : user.postIds[(5*(factor-1))+2] }, function(err, post3) {
        if (post3 == null)
          callback(null, null);
        else
          callback(null, getQuestionListData(post3));
      });
    }, // end third post query
    function(callback){
      Post.findOne({ _id : user.postIds[(5*(factor-1))+3] }, function(err, post4) {
        if (post4 == null)
          callback(null, null);
        else
          callback(null, getQuestionListData(post4));
      });
    }, // end fourth post query
    function(callback){
      Post.findOne({ _id : user.postIds[(5*(factor-1))+4] }, function(err, post5) {
        if (post5 == null)
          callback(null, null);
        else
          callback(null, getQuestionListData(post5));
      });
    }, // end fifth post query
  ], function(err, results) {
    if (err) console.log(err);
    var noSubmittedQuestions = true; // whether or not there are more questions to get
    for (i = 0; i < 5; i++)
      if (results[i] != null)
        noSubmittedQuestions = false;
    callback(results, noSubmittedQuestions);
  });
} // end getQuestionList

// gets the question string, post score, and date created from the post
function getQuestionListData (post) {      
  if (post != undefined) { // makes sure post isn't undefined
    var json = {};
    json.id = post._id;
    json.question = post.question;
    json.score = post.score;
    json.date = String(post.created).substr(4, 11);
    json.shortid = post._shortid;
    return json;
  } // end if
} // end getQuestionListData

module.exports.getQuestionList = getQuestionList;

// calculates the score of a post for ordering in Redis (based on time since submission, score (net votes), # answers)
// updates the post in the respective redis sorted sets
function calcPostScore (post, callback) { // order, seconds, and ansOrder commented out to maintain formula but conserve variable mem allocation
  // var order = log10(Math.max(Math.abs(post.score), 1));
  var sign = 1; 
  if (post.score < 0) 
    sign = -1;
  // var seconds = (post.created/1000)-1386673320; // seconds between post creation and 12/10/2013 6:02AM GMT-5
  var numAns = 0;
  for (var x = 0; x < post.answers.length; x++) // count number answers
    for (var y in post.answers[x])
      numAns += post.answers[x][y];
  // var ansOrder = log10(Math.max(numAns, 1)); // worth as much as a net upvote
  var score = (Math.log(Math.max(Math.abs(post.score), 1))/Math.LN10 + Math.log(Math.max(numAns, 1))/Math.LN10 + sign*((post.created/1000)-1386673320)/45000).toFixed(7);
  client.zadd("hotlistMain", score, post._id);
  client.zadd("toplistMain", post.score, post._id);
  client.zadd("hotlist" + post.community, score, post._id);
  client.zadd("toplist" + post.community, post.score, post._id);
  callback();
} // end calcPostScore

// calculate base 10 logarithm (not used to save stack space)
// function log10 (val) { return Math.log(val) / Math.LN10; }

module.exports.calcPostScore = calcPostScore;
