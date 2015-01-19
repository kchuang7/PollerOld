Poller Work Log
===============

TO-DO
-----

I have attempted to roughly list the tasks in chronological order. Everything is subject to change (I will attempt to communicate all non-trivial changes).

**User Authentication**

- Implement "Enter password again" check DN/KC 6/27/14
- Case checking (should usernames be case sensitive?) DN/KC 6/27/14
- Make some changes/improvements to signup/login page design
- Invisible css "bot traps" (since captcha implementation is a pain)
- "Remember me" option in login page (right now, due to the absurd "age" of sessions, this option is essentially already enabled)

**Back-End Design and Implementation**

- Schema model creation [Mongoose SchemaTypes] (http://mongoosejs.com/docs/schematypes.html)
 - usercollection KC 6/27/14
   - username (String)
    - password (hashed String)
    - gender (String, default value: Unidentified)
    - age (Number, default value: Unidentified)
    - education (String, default value: Unidentified)
    - income level (String, default value: Unidentified)
    - post score (Number, how much score they have contributed, like reddit's link karma)
    - questions asked (Number)
    - questions answered (Number)
    - join (sign-up) date (String)
    - array of post id's that user has answered (array of ObjectId's)
 - postcollection DN/KC 6/26/14
   - user that created the post (ObjectId)
    - date created (String) .Date()
    - question (String)
    - 2-10 answers (array of Strings)
    - number of votes for each answer (array of Numbers)
    - total answer votes (Number)
    - upvotes (Number)
    - downvotes (Number)
    - score, upvotes-downvotes (Number)
    - reference to root comments (commentcollection) object for this post (ObjectId)
 - commentcollection (using a tree structure provided by npm module mongoose-nested-set or mongoose-tree) DN
   - comment poster (ObjectId)
    - date/time posted (String) .Date()
    - the comment itself (String)
    - upvotes (Number)
    - downvotes (Number)
    - score (Number)
    - parentPost (single)
    - childrenPosts
 - metriccollection (collection of general site metrics) DN
   - number of users (Number)
    - number of question posts (Number)
    - number of upvotes/downvotes (Number)
    - number of answers voted (Number)
    - number of comments (Number)
- Create database collections inside /data and load with information KC 6/30/14
 - Create a few users with believable data as well as 2 question posts, filling in all attributes defined above EXCLUDING comments

**Front-End Design and Implementation**

- Add FAQ to /about page with good formatting KC 9/14/2014
- Ask page fields (for reference) KC 1/5/2015
 - 1 question text field
 - 2-8 answer fields, with a + sign button to add more to the default 2 answer text fields
 - Submit button
- Profile page (for reference) KC 8/8/2014
 - Formatted statistics of the user's attributes (from usercollection schema)
 - Place for users to enter their demographic information
- Once /ask page is complete, implement client-side JS to enable adding a variable number of answers (2-8) within the /ask page form KC 1/5/2015

**Google Map Javascript API v3 Implementation** KC/DN 8/14/2014

- Research and understand how to use (I believe) the HeatMapLayer section of the API
- Use this API to implement heat density on the map based on the relative location and frequency of the answerer's IP location
 - Start by understanding the mechanics of the API
- req.getIP can get the closest ip of the client?
 - getClientAddress = function (req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0] 
  || req.connection.remoteAddress;
  };
- I'm basically copying stack overflow at this point get location of IP from some site
 - http://www.geoplugin.net/json.gp?ip=<your ip here>&jsoncallback=<suitable javascript function in your source>
 - We can get an xml file? from a website like this:
 - http://stackoverflow.com/questions/2663371/longitude-and-latitude-value-from-ip-address
- Lets pretend we have a way to get lattitude and longitude from an IP.. where do we go from there?
 - Define a location object that contains a lattitude and longitude then store an array of them in the
   post schema?
 - It would be better of we simply had an array of gmap points within the post and then we want to render the heatmap
   we just pass the array into the gmap heatmap function and it will work perfectly fine
- Flow of data: User votes on a post, grab IP from client and then get the longitude and lattitude from that ip, create a
  google.maps.latlng object from the coordinates and store it in the array contained in the post schema that holds the points for
  the heat map
- Rendering: simply pass the array into the rendering function and it will work unless the mongoose arrays are not compatible with the
  arrays required for gmaps
- Create module that converts ip to gmap coordinates DN 7/31/2014
- Create test server before implementation within the project - just manually pass in IP inside server to test
- Limit or disable zoom!
 
**Back-End Design and Implementation**

- Implement and test all functions of the ask form (must update all database items correctly)
- Implement Answer button functionality KC 7/29/14
 - Checks if user is logged in (isLoggedIn() async func in user.js model)
 - Checks if one of the answer choice buttons is even selected
- Acquire client's IP with socket.request.connection.remoteAddress KC 7/25/14
- Implement voting functionality KC 7/12/14

**Highcharts Design Optimization**

- Generate unique colors for each answer and have answer buttons correspond to the color on the progress bar breakdown of answer choices
- Make the Highcharts tooltip (the dialog box you see when you hover over each bar) reflect the correct colors of each bar section in the dialog box's text KC 8/17/2014
- Strange problem that seems to only occur on browsers (Google Chrome only AFAIK) KC 8/16/2014
 - When hovering cursor over the bars, going right to left, tooltip will sometimes combine the contents of 2 adjacent bars the cursor passes over

**Real-Time Implementation**

- Implement socket.io library (which uses jQuery heavily) to make all answer actions real-time KC 6/30/14
- Real-time answering KC 7/29/14
 - Sends user's answer choice to server
 - Server updates all necessary fields in DB as before
 - Send updated information via the websockets (or other socket.io compatible library) duplex channel to all connected clients via broadcast command
 - Client-side javascript file will listen for this broadcast information and update the progress bar, bar chart, and heatmap
- Real-time post voting KC 7/12/14
 - This will update LIVE
- Post sorting (just like comment sorting later on) will only be performed upon a new client connecting or a page refresh, which will obtain the current post order from the DB (later, from Redis)
- NOTE: we will also update the Redis cache when we implement it later

**Front-End Design and Implementation**

- HTML/CSS (using existing modified bootstrap.css and themes) design of comments section
 - Comment entry text field (multiple vertical lines)
 - Submit button
 - Properly displaying comments based on nesting (+ sign or some clickable link next to comments with children comments)

**Comments Section (real-time) Implementation**

- Use chosen mongoose tree module solution to implement commentcollection schema and test by manually creating a sample comment nested tree within the DB
- Verify proper DB read and formatting on front-end page
- Sorting algorithms similar to Reddit's "Hot" algorithm to push high rated and timely comments to the top as well as hiding comments with too many downvotes
 - Can look at Reddit's comment sorting algorithm
 - Sorting is done every time the client visits the page or refreshes
- Comment voting occurs LIVE

**Multi-core cluster module implementation**

- Install and implement cluster module
- Verify that multiple node.js threads exist and are properly load balanced

**In-memory caching solution - Redis Implementation**

- Implement Redis (and redis client, see redis npm module) for updating and serving the live question post listing (do NOT do until functionality of all above features has been verified with a DB-only solution)

**Full-text Search Solution Implementation**

- Initial implementation using elasticsearch.js npm module
- Find a good node.js search engine
 - ElasticSearch, Apache's Solr (both are compatible with mongodb and have their respective client npm modules) or
- Use Amazon AWS CloudSearch (pay-as-you-go pricing)

**Reverse Proxy Implementation**

- HAProxy redirects all http traffic to https with a 301 code; will load balance as well later on
- Must set up separately on deployment server
- Load balancing in conjunction with cluster?

**More User Authentication**

- Implementation of forget password functionality? (requires email from user)

**DEPLOYMENT!**

- Set up fresh AWS instance, install all necessary programs and dependencies, set up database
- "Minify" all static files if possible (removing excess spacing in code)
- gzip outgoing static files to save on bandwidth
- Testing, testing, testing

**Hardening (making our server impenetrable)**

- Understand how NoSQL injection (via form submission) works and countermeasure implementations (not a problem for our use case so far)
- Brute force password cracking
- Cross-site scripting
- Server side javascript injection
- EJS injection
- Client-side scripting (what hostile requests can the client browser send?)
- DDoS (honestly not much we can or should do)
- Run skipfish vulnerability test

**Advertisement Integration**

- Google Ads, what other options
- Where to put ads on site?

**Site Map and more features**

- Google Analytics
- MongoDB MMS Monitoring
- Hashing static file names?
- Redundant backup systems
- Site map will be located in the bottom navbar of the site

**Scalability**

If we ever make it here, congrats! The site has grown enough to warrant scalability to be a problem. 
- Enable Mongo indexing
- Horizontal scaling (sharding)
- Vertical scaling (hardware upgrades)
- See how imgur (on Reddit AMA) scaled

Done (commit log)
-----------------

**FORMAT** *: coder that finished the task, commit date and time, major accomplishments, bugs* [.md markdown API] (http://daringfireball.net/projects/markdown/basics)

- *Next commit log; most recent posts on top*

- Kevin, 01/19/2015 4:00AM
  - Accomplishments
    - Implemented Ask page which creates a new question post and adds it to all appropriate lists
    - Ask pages are associated with their respective communities
    - Implemented caja sanitizer for input form fields
    - Added post score updates during post vote and answer events
    - Added socket.io functionality to 404 page just to validate Ask request on community pages with no existing pages
  - Changed files
    - server.js : commented out and removed extraneous code at bottom, added calcPostScore for upvote/downvote/answer events
    - routes.js : GET ask page as well as POST ask page which instantiates the question post and adds to all postlists, only logged in users can access both the ask page as well as have a post request validated, implemented caja sanitizer inside ask POST handler
    - resources.js : sign in calcPostScore can't be 0 (removed this conditional)
    - post.ejs : edited ask button to not hyperlink to the ask page until the user is authenticated
    - clientPost.js : added user logged in validation to use ask button
    - index.ejs : edited ask button to not hyperlink to the ask page until the user is authenticated
    - client.js : added user logged in validation to the use ask button
    - ask.ejs : ask page with variable number of answer fields
    - clientAsk.js : client-side form validation for ask page
    - 404.ejs : added ask functionality to 404 pages associated with a community
    - 404.js : user validation for ask button
    - package.json : added sanitizer 0.1.2
    - NOTE: changes to DB collections may introduce errors, such as refactored location attributes
    - NOTE: now requires a Redis daemon to be running as well as have correct data for most posts to be displayed. to update the Redis sorted sets (postlists) manually, assuming proper data in mongodb, run the commented code in server.js labeled "Updates Redis list of posts"
    - NOTE: Minified javascript files are not updated; do not use
  - Bugs
    - Password checking is still synchronous!
    - IPv4 geolocation error message will appear due to LAN IP during development env
    - Current session store implementation involves 2 async connections to the session store in server.js. This leads to the "Error setting TTL index on collection : session" error. Cause is because Express server attempts to start before all session store connections to MongoStore have been established. Can be fixed with appropriate callback structure (not a critical issue, even for production).

- Kevin, 09/14/2014 10:30PM
  - Accomplishments
    - Implemented single post page with Highcharts radar chart for answer and demographic correlation "correlation station"
    - Replaced some inefficient jQuery use cases with vanilla JS (like you're supposed to); still many instances of unoptimized client-side code
    - Implemented post sorting algorithm for hot lists based on Reddit's post ranking; net upvotes and answers are weighted the same
    - Set up and running Redis to provide fast updates of post rankings for hot list and top list
    - Created about page and added GET listener; started FAQ
  - Changed files
    - server.js : can't think of anything changed but will push just for consistency
    - routes.js : added GET handlers for single post page and about page
    - resources.js : updated getPostUser function to properly obtain postid order from Redis or Mongo depending on the postlist type (hotlist/toplist - Redis, newlist - Mongo); added calcPostScore function to update the post's rank score and updates Redis to reflect the new rank score
    - post.ejs : full featured single post page with all the functionality expected from posts in postlist pages; added comments template in html
    - clientPost.js : implemented Highcharts radar chart
    - client.min.js : minified version of client.js using UglifyJS
    - clientPost.min.js : minified version of clientPost.js using UglifyJS
    - about.ejs : about page with an incomplete FAQ
    - package.json : added redis and hiredis
    - NOTE: changes to DB collections may introduce errors, such as refactored location attributes
    - NOTE: now requires a Redis daemon to be running as well as have correct data for most posts to be displayed
  - Bugs
    - Password checking is still synchronous!
    - IPv4 geolocation error message will appear due to LAN IP during development env
    - Current session store implementation involves 2 async connections to the session store in server.js. This leads to the "Error setting TTL index on collection : session" error. Cause is because Express server attempts to start before all session store connections to MongoStore have been established. Can be fixed with appropriate callback structure (not a critical issue, even for production).

- Kevin, 08/17/2014 11:00PM
  - Accomplishments
    - Implemented core features of profile page (routing, dynamic question post loading, edit demographics functionality)
    - Implemented New and Top tabs as well as generalized post reading from any community or post list
    - Implemented communities: /c/ path denotes community
    - Implemented heatmaps: renders heatmap for each individual answer choice, updates heatmap live whenever someone answers, implements geolocation and handles cases where geolocation from IP fails
    - All values in demographics chart will now properly update in real time
    - Restricts user to only edit demographics every 30 minutes with setTimeout
    - Some malicious input handling inside server.js
    - Fixed unhandled null case in IPToLocation.js
    - Short attribute revisions to comment schema
    - Implemented socket-anti-spam; automatically disconnects clients that spam socket emit events (screw them all)
    - Custom 404 message for 404 page
    - Static file paths will now have the correct number of ../ to start file navigation from root static folder (/public) using a custom constructed string of '../'
    - Revised signup and login route handlers to redirect to proper places
    - Fixed small bug with the submitID id in the answer modal not being reset after each answer submission; resulted in the inability to answer more than one question per page
    - Removed "order" attribute from post - not needed as sorting is done in Redis
    - Fixed Highcharts tooltip bug - tooltip text color now matches the bar
    - Highcharts tooltip bug that "combines" tooltips from adjacent bars seems to have been resolved (I speculate that this is due to bug fixes elsewhere in the program but I am unsure where this occurred)
  - Changed files
    - server.js : added some more fields to be sent to client.js, some malicious socket.io input handling (upvote/downvote, answerRequest, answer), heatmaps geolocation implementation, completion of answer functionality and db write
    - resources.js : added a question list loading helper function
    - routes.js : added route handling for any community or post list along with custom 404s, implemented profile route handler
    - IPToLocation.js : fixed null handling bug
    - comment.js : revised fields
    - client.js : added country implementation (updates in highcharts and heatmap), disabled Highcharts loading animation
    - index.ejs : implemented heatmaps, added communities dropdown list, comments and share hyperlinks link to the post page, time elapsed between post creation and now
    - post.js : removed order attribute, added numComments attribute
    - profile.ejs : implementation of profile page with appropriate ejs logic
    - clientProfile.js : accompanying script with profile page that handles displaying and updating basic information, live score update of questions in question list
    - 404.ejs : default 404 page with custom message support
    - package.json : added latest 0.1.6 socket-anti-spam module, added shortid, moment, moment-timezone, and jstimezonedetect
    - NOTE: changes to DB collections may introduce errors, such as refactored location attributes
  - Bugs
    - Password checking is still synchronous!
    - IPv4 geolocation error message will appear due to LAN IP during development env
    - Current session store implementation involves 2 async connections to the session store in server.js. This leads to the "Error setting TTL index on collection : session" error. Cause is because Express server attempts to start before all session store connections to MongoStore have been established. Can be fixed with appropriate callback structure (not a critical issue, even for production).

- Kevin, 07/31/2014 4:00AM
  - Accomplishments
    - Created test data set with 7 posts
    - Clicking on answer button will pull up appropriate demographics chart
    - Answered questions will have a disabled answer button
    - Applied Monda font and some stylistic changes to Highcharts
    - Custom answer modal based on user's demographics
    - Real-time answer functionality built in - saves all demographic information from user and updates all client pages
    - SOME malicious input handling (any console logging that is red)
    - Changed title of login.ejs page
    - 404 handler now redirects to custom 404.ejs page
  - Changed files
    - server.js : implementation of answer request and answer submission handler functions, added some more fields to be sent to client.js
    - routes.js : added some more fields to be sent to index.ejs
    - client.js : added more socket.io listeners to handle changes in specific answer state, tooltips, and popovers, added modified Highcharts theme
    - index.ejs : implemented answer modal, implemented initial values for tooltips and popovers from data received from router
    - user.js : added a few fields to track answered questions
    - post.js : edited a few fields (country)
    - login.ejs : changed title
    - passport.js : fixed "Check if username exists" to be case insensitive
    - package.json : added latest colors.js module
    - NOTE: everything will only work if your DB contains adequate information which you should with the instructions in TestDataSet.js module in /app
  - Bugs
    - Country demographics hasn't been handled nor has heatmaps been implemented
    - IPv4 geolocation error message will appear due to LAN IP during development env
    - Current session store implementation involves 2 async connections to the session store in server.js. This leads to the "Error setting TTL index on collection : session" error. Cause is because Express server attempts to start before all session store connections to MongoStore have been established. Can be fixed with appropriate callback structure.

- Kevin, 07/12/2014 11:10PM
  - Accomplishments
    - Completed all features of live voting module
    - Denies voting to clients that aren't logged in
    - Tracks upvote/downvote status of each user and displays specific arrows on the logged in user's page
    - User may only upvote once, cancel upvote, downvote once, or cancel downvote
    - Tooltip appears over orange arrow to reinforce message that upvote or downvote has already been done
    - Hovering over score brings up a popover that shows number of upvotes/downvotes and ratio
    - Implemented passport.socketio 3.2.0 to access session user data inside socket.io
    - Added 2 more arrays to User schema to track upvoted and downvoted posts
    - Fixed pagination parsing error beyond page 2
    - Fixed cross-browser HTML render inconsistencies (tested on latest versions of IE, Firefox, and Chrome)
  - Changed files
    - server.js : implemented passport.socketio, full implementation of vote handler functions, maintains list of connected user ObjectIds in a Set (not necessary)
    - routes.js : fixes of previous bugs, added 4 additional arrays to be sent over to client for displaying user specific voting information
    - client.js : added more socket.io listeners to handle changes in specific vote state, tooltips, and popovers
    - index.ejs : added custom css class definitions for our implementations of Bootstrap's modal, tooltip, and popover DOM objects, implemented initial values for tooltips and popovers from data received from router
    - package.json : cookie-parser version to 1.3.2, passport.socketio version to 3.2.0
    - NOTE: everything will only work if your DB contains adequate information
  - Bugs
    - server.js contains construction for a MATHEMATICALLY ILLOGICAL data set for the NSA question post - next patch will include a module containing construction of a standardized test data set
    - Current session store implementation involves 2 async connections to the session store in server.js. This leads to the "Error setting TTL index on collection : session" error. Cause is because Express server attempts to start before all session store connections to MongoStore have been established. Can be fixed with appropriate callback structure.

- Kevin, 07/09/2014 10:00PM
  - Accomplishments
    - Implemented pagination
    - Added some session functionality - subtle changes to layout depending on login status
    - Cleaned up code in index.ejs and client.js
  - Changed files
    - routes.js : some session variables implemented (they are tracked at top in comments)
    - client.js : code cleanup
    - index.ejs : pagination and code cleanup
    - NOTE: everything will only work if your DB contains adequate information
  - Bugs
    - server.js contains construction for a MATHEMATICALLY ILLOGICAL data set for the NSA question post - fix will come later
    - Currently cannot access session data in server.js, inhibiting logged in checks
    - comments and share functionality not built in

- Kevin, 07/08/2014 12:30AM
  - Accomplishments - db read patch 2
    - Fully generalized db read and display of up to 5 posts per page
    - Unique colors assigned to different answers, which correspond to the correct color and percent reflection in the progress bar
    - Edited addHotList function in postlist schema to properly insert a new post into the hotlist
    - Implemented live post voting
  - Changed files
    - package.json (added async)
    - resources.js : contains various data and utilities that the app will need (5 post page async queries are here)
    - server.js : send demographic data using socket.io to client, some changes to schema test data saving
    - routes.js : sends the proper number of post data in arrays
    - postlist.js : fixed addHotList implementation
    - client.js : creates a variable number of demographic (total count only) charts
    - index.ejs : generalized EJS logic to work with 0-5 posts on a page
    - NOTE: everything will only work if your DB contains adequate information
  - Bugs
    - server.js contains construction for a MATHEMATICALLY ILLOGICAL data set for the NSA question post - fix will come later
    - no session checking for post voting
    - username link doesn't actually link to the user's unique profile URL
    - comments and share functionality not built in

- Damien, 07/05/14 12:05 AM
  - Accomplishments
    - Updated comment schema and working on how to query for them and display them in the right order and nest them.
    - Added a heatmap schema to hold point arrays for the heatmaps in the posts
    - Added a test page for comment rendering testing it is /comments
  - Bugs
    - N/A

- Kevin, 6/30/14 5:40PM
  - Accomplishments - db read patch 1
    - Session store changed from RedisStore to MongoStore (requires connect-mongo module)
    - Implement postlistcollection schema (only 1 document of this type, which contains/maintains 3 lists of posts)
    - Properly sends and renders a single question post based on DB data
  - Changed files
    - package.json
    - server.js : MongoStore and socket.io server implementation
    - routes.js : sends resources (variables) and db information to render question postobjects
    - post.js : contains all post information EXCEPT regarding comments and map location bo
    - postlist.js : 3 arrays of ObjectId references (hotlist, newlist, toplist)
    - client.js : connects to socket.io server, dynamicallyl builds demographic chart from JSON "data" sent via socket.io event "newConnect"
    - resources.js : contains some static variables that the client may need
    - index.ejs : contains embedded JS to enable dynamic rendering of a question post
    - NOTE: everything will only work if your DB contains adequate information - refer to server.js for adding the appropriate data to the DB
  - Bugs
    - username link doesn't actually link to the user's unique profile URL
    - comments and share functionality not built in

- Kevin, 6/27/14 8:01PM
  - Accomplishments
    - Resolved ObjectId linking to User object in post schema
  - Bugs
    - Reference to comment ObjectId not complete

- Kevin, 6/27/14 6:32PM
  - Accomplishments
    - Implement password confirmation check in signup
    - Added 'username_lower' field to userSchema for indexed case-insensitive queries (faster than regex)
    - All auth logic is handled in passport.js

- Damien, 6/27/14 12:30AM
  - Accomplishments
    - Implement password checking in signup
    - Added aboutus.ejs for our FAQ
  - Bugs
    - I can't get it to flash "Passwords must match" when the passwords don't match,
      the code is in routes.js

- Damien, 6/26/14 10:40PM
  - Accomplishments
    - Made case insensitive usernames

- Kevin, 6/26/14 7:04PM
  - Accomplishments
    - Revised and completed post schema
    - Included (temporary) test document creation in server.js
  - Bugs
    - mongoose Schema only accept existing ObjectId references
    - The user and comment attributes have not been implemented yet
    - user attribute uses arbitrary uuid (ObjectId)
    - comments attribute is commented out

- Damien, 6/26/14 5:00PM
  - Accomplishments
    - Created metrics schema
  - Bugs
    - N/A

- Damien, 6/26/14 4:20!!PM
  - Accomplishments
    - Created comment schema
  - Bugs
    - N/A

- Damien, 6/26/14 1:46PM
  - Accomplishments
    - Fixed the post schema to reflect proper variable names
  - Bugs
    - None that I am aware of

- Damien, 6/26/14 12:00PM
  - Accomplishments
    - Created the framework for the post Schema and tested pushing
    the changes to the origin on github
  - Bugs
    - I am unsure of how ObjectIDs are supposed to be represented in
    a schema and because of that I just left the references to objects
    as name : var.

- Kevin, 6/26/14 4:00AM
  - Accomplishments
    - *This is an example post*
    - Wrote v1.0 of README.md (more importantly, the TO-DO list)
  - Bugs
    - N/A



