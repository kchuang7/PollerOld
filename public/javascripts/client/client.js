// wraps entire listener in this so that every page refresh is equivalent (for our purposes) to a new connection
window.onload = function() {

var socket = io();

socket.on('newConnect', function (clientData) {
  
  var staticDirPath = ""; // for navigating up parent directories to root directory
  for (z = 0; z < clientData.url.split("/").length - 1; z++) { staticDirPath += "../"; } 

  var top5 = clientData.top5; // post list on the page

  // contains button click state for which answer demographic chart is displayed
  // ex. [2, 1, 5, 4] (index is post index from top, number is answer choice selected state, with 0 being the first answer choice)
  var answerBtnClicked = [];

  // initialize all demographic charts
  for (i = 0; i < clientData.answerVotes.length; i++) {
    if (top5[i] != null) {
      var numAns = clientData.genderUnidentified[i].length-1; // number of answer choices (also the answer choice number for show all)
      answerBtnClicked[i] = numAns; // initializes answerBtnClicked array to all "Show All" selection states
      renderChart(i, numAns, numAns);
    } // end if
  } // end for
  
  // not logged in listener : creates popup box notifying user that they are not logged in and cannot use a certain feature
  socket.on('notLoggedIn', function (data) {
    if (data.feature == 'post vote')
      $('#notLoggedInPostVote').modal('show');
    else if (data.feature == 'answer vote')
      $('#notLoggedInAnswerVote').modal('show');
    else if (data.feature == 'ask')
      $('#notLoggedInAsk').modal('show');
  }); // end not logged in listener

  // updates vote arrows for logged in user
  socket.on('upvoteRender', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got upvoted - save into upvotedPostIndex
    var upvotedPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        upvotedPostIndex = i;
        break;
      }
    }
    // changes vote indication arrows
    if (data.neutral) {
      $('#downvote' + (upvotedPostIndex+1)).attr('data-original-title', "").tooltip('hide');
      $('#downvoteimg' + (upvotedPostIndex+1)).attr('src', staticDirPath+"images/glyphicons_free/glyphicons/png/glyphicons_212_down_arrow.png");
      $('#downvotelink' + (upvotedPostIndex+1)).attr('style', "cursor: pointer");
    }
    else { // is in upvoted position
      $('#upvote' + (upvotedPostIndex+1)).attr('data-original-title', "Already upvoted!").tooltip('show');
      $('#upvoteimg' + (upvotedPostIndex+1)).attr('src', staticDirPath+"images/glyphicons_213_up_arrow_orange.png");
      $('#upvotelink' + (upvotedPostIndex+1)).attr('style', "");      
    }
  }); // end upvote render listener

  // updates vote arrows for logged in user
  socket.on('downvoteRender', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got upvoted - save into upvotedPostIndex
    var downvotedPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        downvotedPostIndex = i;
        break;
      }
    }
   // changes vote indication arrows
    if (data.neutral) {
      $('#upvote' + (downvotedPostIndex+1)).attr('data-original-title', "").tooltip('hide');
      $('#upvoteimg' + (downvotedPostIndex+1)).attr('src', staticDirPath+"images/glyphicons_free/glyphicons/png/glyphicons_213_up_arrow.png");
      $('#upvotelink' + (downvotedPostIndex+1)).attr('style', "cursor: pointer");
    }
    else { // is in downvoted position
      $('#downvote' + (downvotedPostIndex+1)).attr('data-original-title', "Already downvoted!").tooltip('show');
      $('#downvoteimg' + (downvotedPostIndex+1)).attr('src', staticDirPath+"images/glyphicons_212_down_arrow_orange.png");
      $('#downvotelink' + (downvotedPostIndex+1)).attr('style', "");      
    }
  }); // end downvote render listener

  // upvote listener
  socket.on('upvote', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got upvoted - save into upvotedPostIndex
    var upvotedPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        upvotedPostIndex = i;
        break;
      }
    }
    // updates score
    $('#popoverUpvote' + (upvotedPostIndex+1)).text(data.upvotes);
    $('#popoverDownvote' + (upvotedPostIndex+1)).text(data.downvotes);
    $('#score' + (upvotedPostIndex+1)).text(data.score);
    $('#score' + (upvotedPostIndex+1)).attr('data-original-title', "<b>" + (data.upvotes/(data.upvotes+data.downvotes)*100).toFixed(2) + "</b>% liked");
  }); // end upvote listener

  // downvote listener
  socket.on('downvote', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got downvoted - save into downvotedPostIndex
    var downvotedPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        downvotedPostIndex = i;
        break;
      }
    }
    // updates score
    $('#popoverDownvote' + (downvotedPostIndex+1)).text(data.downvotes);
    $('#popoverUpvote' + (downvotedPostIndex+1)).text(data.upvotes);
    $('#score' + (downvotedPostIndex+1)).text(data.score);
    $('#score' + (downvotedPostIndex+1)).attr('data-original-title', "<b>" + (data.upvotes/(data.upvotes+data.downvotes)*100).toFixed(2) + "</b>% liked");
  }); // end downvote listener

  // redirectAsk listener - redirects to community ask page if user is logged in
  socket.on('redirectAsk', function (data) {
    window.location.href = "/c/" + community + "/ask";
  }); // end redirectAsk listener

  // answerModal listener 
  socket.on('answerModal', function (data) {
    $('.demographicsModal input[name^="demographic"]').each( function() { // reset all checkboxes upon modal initialize
      $(this).prop('checked', false);
    });
    $('#submitID').attr('id', 'submitAnswer' + parseInt(data.postIndex+1)); // gives answer modal unique post index identifier
    $('#answerModal').modal('show');
  }); // end answerModal listener

  // answerRender listener changes Answer button to unclickable state for user that just answered the post
  socket.on('answerRender', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got answered - save into answeredPostIndex
    var answeredPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        answeredPostIndex = i;
        break;
      }
    }
    // updates Answer button
    $('#answer' + (answeredPostIndex+1)).attr({'data-original-title': "Already answered!", 'rel': "popover", 'data-trigger': "hover", 'style': "background-color: #477447; color: White"});
    $('#answer' + (answeredPostIndex+1)).toggleClass('answer alreadyAnswered');
    $('#answer' + (answeredPostIndex+1)).attr('id', 'alreadyAnswered' + (answeredPostIndex+1));
  }); // end answerRender listener

  // answer listener updates post after a user submits an answer
  socket.on('answer', function (data) {
    // purpose of this post id check is in case the post somebody else votes on is in a different location in this client's post list (or not there at all)
    // i tells me which post (0 is first, 4 is last) in this client's post list got answered - save into answeredPostIndex
    var answeredPostIndex = -1;
    for (i = 0; i < top5.length; i++) {
      if (data.postid == top5[i]) {
        answeredPostIndex = i;
        break;
      }
    }
    if (answeredPostIndex != -1) { // only updates page if updated post is on page
      var chartId = '#dem-chart' + (answeredPostIndex+1);
      var chart = $(chartId).highcharts();
      var numAns = clientData.genderUnidentified[answeredPostIndex].length-1;

      // checks if client's post answer selection is on affected demographic chart - updates chart only if applicable

      // gender
      switch (data.demographics[0]) {
        case 'genderUnidentified':
          clientData.genderUnidentified[answeredPostIndex][data.answerChoice] += 1;
          clientData.genderUnidentified[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns) // checks if user is on the graph to be updated or the show all graph
            chart.series[0].data[0].update({y: chart.series[0].data[0].y + 1});
          break;
        case 'genderMale':
          clientData.genderMale[answeredPostIndex][data.answerChoice] += 1;
          clientData.genderMale[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[1].data[0].update({y: chart.series[1].data[0].y + 1});
          break;
        case 'genderFemale':
          clientData.genderFemale[answeredPostIndex][data.answerChoice] += 1;
          clientData.genderFemale[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[2].data[0].update({y: chart.series[2].data[0].y + 1});
          break;
      } // end gender switch
    
      // age
      switch (data.demographics[1]) {
        case 'ageUnidentified':
          clientData.ageUnidentified[answeredPostIndex][data.answerChoice] += 1;
          clientData.ageUnidentified[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[3].data[1].update({y: chart.series[3].data[1].y + 1});
          break;
        case 'age_40':
          clientData.age_40[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_40[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[4].data[1].update({y: chart.series[4].data[1].y + 1});
          break;
        case 'age_35_39':
          clientData.age_35_39[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_35_39[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[5].data[1].update({y: chart.series[5].data[1].y + 1});
          break;
        case 'age_30_34':
          clientData.age_30_34[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_30_34[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[6].data[1].update({y: chart.series[6].data[1].y + 1});
          break;
        case 'age_26_29':
          clientData.age_26_29[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_26_29[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[7].data[1].update({y: chart.series[7].data[1].y + 1});
          break;
        case 'age_22_25':
          clientData.age_22_25[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_22_25[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[8].data[1].update({y: chart.series[8].data[1].y + 1});
          break;
        case 'age_19_21':
          clientData.age_19_21[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_19_21[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[9].data[1].update({y: chart.series[9].data[1].y + 1});
          break;
        case 'age_15_18':
          clientData.age_15_18[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_15_18[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[10].data[1].update({y: chart.series[10].data[1].y + 1});
          break;
        case 'age_13_14':
          clientData.age_13_14[answeredPostIndex][data.answerChoice] += 1;
          clientData.age_13_14[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[11].data[1].update({y: chart.series[11].data[1].y + 1});
          break;
      } // end age switch
    
      // education
      switch (data.demographics[2]) {
        case 'eduUnidentified':
          clientData.eduUnidentified[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduUnidentified[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[12].data[2].update({y: chart.series[12].data[2].y + 1});
          break;
        case 'eduPostgrad':
          clientData.eduPostgrad[answeredPostIndex][data.answerChoice] += 11;
          clientData.eduPostgrad[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[13].data[2].update({y: chart.series[13].data[2].y + 1});
          break;
        case 'eduMaster':
          clientData.eduMaster[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduMaster[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[14].data[2].update({y: chart.series[14].data[2].y + 1});
          break;
        case 'eduBachelor':
          clientData.eduBachelor[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduBachelor[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[15].data[2].update({y: chart.series[15].data[2].y + 1});
          break;
        case 'eduAssociate':
          clientData.eduAssociate[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduAssociate[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[16].data[2].update({y: chart.series[16].data[2].y + 1});
          break;
        case 'eduHS':
          clientData.eduHS[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduHS[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[17].data[2].update({y: chart.series[17].data[2].y + 1});
          break;
        case 'eduMS':
          clientData.eduMS[answeredPostIndex][data.answerChoice] += 1;
          clientData.eduMS[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[18].data[2].update({y: chart.series[18].data[2].y + 1});
          break;
      } // end education switch
      // income
      switch (data.demographics[3]) {
        case 'incomeUnidentified':
          clientData.incomeUnidentified[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeUnidentified[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[19].data[3].update({y: chart.series[19].data[3].y + 1});
          break;
        case 'incomeUpper':
          clientData.incomeUpper[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeUpper[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[20].data[3].update({y: chart.series[20].data[3].y + 1});
          break;
        case 'incomeUpperMiddle2':
          clientData.incomeUpperMiddle2[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeUpperMiddle2[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[21].data[3].update({y: chart.series[21].data[3].y + 1});
          break;
        case 'incomeUpperMiddle1':
          clientData.incomeUpperMiddle1[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeUpperMiddle1[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[22].data[3].update({y: chart.series[22].data[3].y + 1});
          break;
        case 'incomeMiddleMiddle':
          clientData.incomeMiddleMiddle[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeMiddleMiddle[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[23].data[3].update({y: chart.series[23].data[3].y + 1});
          break;
        case 'incomeLowerMiddle':
          clientData.incomeLowerMiddle[answeredPostIndex][data.answerChoice] += 1;
          clientData.incomeLowerMiddle[answeredPostIndex][numAns] += 1;
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[24].data[3].update({y: chart.series[24].data[3].y + 1});
          break;
      } // end income switch

      // update country
      var found = false; // whether or not client country is in current country list on chart
      for (c = 25; c < chart.series.length; c++) {
        if (data.demographics[4] == chart.series[c].name) { // check if client location is already in country list on chart
          clientData.numCountries[answeredPostIndex][data.answerChoice][c-25] += 1; // increments count for that country (on answer)
          clientData.numCountries[answeredPostIndex][numAns][c-25] += 1; // increments count for that country (total)
          if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns)
            chart.series[c].data[4].update({y: chart.series[c].data[4].y + 1});
          found = true;
        } // end if
      } // end for

      // adds new country to country list if not on there already
      if (!found && data.demographics[4] != null) {
        clientData.countries[answeredPostIndex].push(data.demographics[4]);
        for (k = 0; k <= numAns; k++) {
          if (k == data.answerChoice || k == numAns)
            clientData.numCountries[answeredPostIndex][k][clientData.countries[answeredPostIndex].length-1] = 1;
          else
            clientData.numCountries[answeredPostIndex][k][clientData.countries[answeredPostIndex].length-1] = 0;
        } // end for
        if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns) // add (new) country to chart with value 1
          chart.addSeries({ showInLegend: false, name: data.demographics[4], data: [null, null, null, null, {y: 1}] });
        else // add (new) country to chart with value 0
          chart.addSeries({ showInLegend: false, name: data.demographics[4], data: [null, null, null, null, {y: 0}] });
      } // end if
      
      // updates answer data
      clientData.answerVotes[answeredPostIndex][data.answerChoice] += 1;
      var total=0; for (var j=0;j<clientData.answerVotes[answeredPostIndex].length;j++) total+=clientData.answerVotes[answeredPostIndex][j];
      for (var j = 0; j < clientData.answerVotes[answeredPostIndex].length; j++) {
        $('#progress' + parseInt(answeredPostIndex+1) + parseInt(j+1)).css('width', 100*clientData.answerVotes[answeredPostIndex][j]/total+'%').attr('aria-valuenow', 100*clientData.answerVotes[answeredPostIndex][j]/total);
        $('#progressContent' + parseInt(answeredPostIndex+1) + parseInt(j+1)).html('<b>' + clientData.letters[j] + '.</b> ' + parseInt(clientData.answerVotes[answeredPostIndex][j]) + ' (' + (100*clientData.answerVotes[answeredPostIndex][j]/total).toFixed(2) + '%)');
      } // end for
      
      // make sure geolocation succeeded and returned a valid latlng
      if (data.demographics[5] != null) {
        clientData.locations[answeredPostIndex][data.answerChoice].push(data.demographics[5]); // updates answer specific latlng location array
        clientData.locations[answeredPostIndex][numAns].push(data.demographics[5]); // updates total latlng location array
  
        // updates heatmap if client is focused on it
        if (data.answerChoice == answerBtnClicked[answeredPostIndex] || answerBtnClicked[answeredPostIndex] == numAns) { // checks if user is on the heatmap to be updated or the show all graph     
          switch (answeredPostIndex) { // updates heatmap by updating MVCArray containing latlngs
            case 0:
              pointArray1.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
              break;
            case 1:
              pointArray2.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
              break;
            case 2:
              pointArray3.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
              break;
            case 3:
              pointArray4.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
             break;
            case 4:
              pointArray5.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
              break;
          } // end switch
        } // end if (heatmap focused)
      } // end if (null check)
      
    } // end if
  }); // end answer listener

  // upvote button listener
  $(".upvote").on('click', function() {
    var id = this.id;
    socket.emit('upvote', { postid : top5[parseInt(id.substring(6, id.length))-1] });
  });

  // downvote button listener
  $(".downvote").on('click', function() {
    var id = this.id;
    socket.emit('downvote', { postid : top5[parseInt(id.substring(8, id.length))-1] });
  });

  // ask button listener - only applies if not Main community
  if (community != "Main") {
    document.getElementById('askBtn').onclick = function () {
      socket.emit('askRequest', {});
    }
  } // end if

  // answer CHOICE button listener (updates demographic chart and heatmap based on selected answer)
  $(".answerChoice").on('click', function() {
    var id = this.id; // format: answer<postIndex><ansIndex>
    var postIndex = parseInt(id.substring(6, 7))-1;
    var ansIndex = parseInt(id.substring(7, 8))-1;
    if (answerBtnClicked[postIndex] != ansIndex) { // only renders chart if not already selected
      switch (postIndex) { // updates heatmap by updating MVCArray containing latlngs
        case 0:
          while (pointArray1.length > 0) // empties array to be reloaded
            pointArray1.pop();
          for (z = 0; z < clientData.locations[postIndex][ansIndex].length; z++)
            pointArray1.push(new google.maps.LatLng(clientData.locations[postIndex][ansIndex][z][0], clientData.locations[postIndex][ansIndex][z][1]));
          break;
        case 1:
          while (pointArray2.length > 0) // empties array to be reloaded
            pointArray2.pop();
          for (z = 0; z < clientData.locations[postIndex][ansIndex].length; z++)
            pointArray2.push(new google.maps.LatLng(clientData.locations[postIndex][ansIndex][z][0], clientData.locations[postIndex][ansIndex][z][1]));
          break;
        case 2:
          while (pointArray3.length > 0) // empties array to be reloaded
            pointArray3.pop();
          for (z = 0; z < clientData.locations[postIndex][ansIndex].length; z++)
            pointArray3.push(new google.maps.LatLng(clientData.locations[postIndex][ansIndex][z][0], clientData.locations[postIndex][ansIndex][z][1]));
          break;
        case 3:
          while (pointArray4.length > 0) // empties array to be reloaded
            pointArray4.pop();
          for (z = 0; z < clientData.locations[postIndex][ansIndex].length; z++)
            pointArray4.push(new google.maps.LatLng(clientData.locations[postIndex][ansIndex][z][0], clientData.locations[postIndex][ansIndex][z][1]));
         break;
        case 4:
          while (pointArray5.length > 0) // empties array to be reloaded
            pointArray5.pop();
          for (z = 0; z < clientData.locations[postIndex][ansIndex].length; z++)
            pointArray5.push(new google.maps.LatLng(clientData.locations[postIndex][ansIndex][z][0], clientData.locations[postIndex][ansIndex][z][1]));
          break;
      } // end switch
      answerBtnClicked[postIndex] = ansIndex;
      $('#answer' + (postIndex+1)).attr('data-original-title', "").tooltip('hide');
      renderChart(postIndex, ansIndex, clientData.genderUnidentified[postIndex].length-1); // last arg is numAns
    } // end if
  }); // end answer CHOICE button listener

  // showAll button listener
  $(".showAll").on('click', function() {
    var id = this.id;
    var postIndex = parseInt(id.substring(7, 8))-1;
    var numAns = clientData.genderUnidentified[postIndex].length-1;
    if (answerBtnClicked[postIndex] != numAns) { // only renders chart if not already selected
      switch (postIndex) { // updates heatmap by updating MVCArray containing latlngs
        case 0:
          while (pointArray1.length > 0) // empties array to be reloaded
            pointArray1.pop();
          for (z = 0; z < clientData.locations[postIndex][numAns].length; z++)
            pointArray1.push(new google.maps.LatLng(clientData.locations[postIndex][numAns][z][0], clientData.locations[postIndex][numAns][z][1]));
          break;
        case 1:
          while (pointArray2.length > 0) // empties array to be reloaded
            pointArray2.pop();
          for (z = 0; z < clientData.locations[postIndex][numAns].length; z++)
            pointArray2.push(new google.maps.LatLng(clientData.locations[postIndex][numAns][z][0], clientData.locations[postIndex][numAns][z][1]));
          break;
        case 2:
          while (pointArray3.length > 0) // empties array to be reloaded
            pointArray3.pop();
          for (z = 0; z < clientData.locations[postIndex][numAns].length; z++)
            pointArray3.push(new google.maps.LatLng(clientData.locations[postIndex][numAns][z][0], clientData.locations[postIndex][numAns][z][1]));
          break;
        case 3:
          while (pointArray4.length > 0) // empties array to be reloaded
            pointArray4.pop();
          for (z = 0; z < clientData.locations[postIndex][numAns].length; z++)
            pointArray4.push(new google.maps.LatLng(clientData.locations[postIndex][numAns][z][0], clientData.locations[postIndex][numAns][z][1]));
         break;
        case 4:
          while (pointArray5.length > 0) // empties array to be reloaded
            pointArray5.pop();
          for (z = 0; z < clientData.locations[postIndex][numAns].length; z++)
            pointArray5.push(new google.maps.LatLng(clientData.locations[postIndex][numAns][z][0], clientData.locations[postIndex][numAns][z][1]));
          break;
      } // end switch  
      answerBtnClicked[postIndex] = numAns;
      renderChart(postIndex, numAns, numAns);
    } // end if
  }); // end showAll button listener
  
  // answer button listener will send an answer request ONLY
  $(".answer").on('click', function() {
    var id = this.id;
    if (id.indexOf('alreadyAnswered') == -1) { // checks if post has been answered
      var postIndex = parseInt(id.substring(6, 7))-1;
      var numAns = clientData.genderUnidentified[postIndex].length-1;
      if (answerBtnClicked[postIndex] == numAns)
        $('#answer' + (postIndex+1)).attr('data-original-title', "Select an answer!").tooltip('show');
      else
        socket.emit('answerRequest', { postid : top5[postIndex], postIndex : postIndex });
    } // end if
  }); // end answer button listener

  // alreadyAnswered button listener
  $(".alreadyAnswered").on('click', function() {
    $('#alreadyAnswered' + parseInt(this.id.substring(15, 16))).tooltip('show');
  }); // end alreadyAnswered button listener

  // submitAnswer button listener
  $(".submitAnswer").on('click', function() {
    var id = this.id;
    var postIndex = parseInt(id.substring(12, 13))-1;
    var checkboxData = {};
    $('.demographicsModal input[name^="demographic"]').each( function() { // loads all checkbox states into an object to be sent to server
      checkboxData[this.name] = $(this).prop('checked');
    });
    $(this).attr('id', 'submitID'); // change modal submit button back to generic 'submitID'
    socket.emit('answer', { postid : top5[postIndex], answerChoice : answerBtnClicked[postIndex], checkboxData : checkboxData });
  }); // end submitAnswer button listener

  // includeAll button listener - select all demographic checkboxes 
  $('#includeAll').on('click', function () {
    $('.demographicsModal input[name^="demographic"]').each(function() {
      // toggle checkbox
      $(this).prop('checked', true);
      // toggle class
      $(this).parents('label').toggleClass('active');
    });
  }); // end includeAll button listener

  // resetAll button listener - reset all demographic checkboxes 
  $('#resetAll').on('click', function () {
    $('.demographicsModal input[name^="demographic"]').each(function() { $(this).prop('checked', false); });
  }); // end resetAll button listener

  // renders one demographic chart based on parameters
  function renderChart (index, ansIndex, numAns) {
    var chartData = [{
        showInLegend: false,
        name: 'Unidentified',
        data: [{y: clientData.genderUnidentified[index][ansIndex]}],
        color: '#D3D3D3'
      }, {
        showInLegend: false,
        name: 'Male',
        data: [{y: clientData.genderMale[index][ansIndex]}], 
        color: '#00BFFF'
      }, {
        showInLegend: false,
        name: 'Female',
        data: [{y: clientData.genderFemale[index][ansIndex]}], 
        color: '#FF69B4'
      }, {
        showInLegend: false,
        name: 'Unidentified',
        data: [null, {y: clientData.ageUnidentified[index][ansIndex]}], 
        color: '#D3D3D3'
      }, {
        showInLegend: false,
        name: '40+',
        data: [null, {y: clientData.age_40[index][ansIndex]}], 
        color: '#2252FF'
      }, {
        showInLegend: false,
        name: '35-39', 
        data: [null, {y: clientData.age_35_39[index][ansIndex]}], 
        color: '#446DFF'
      }, {
        showInLegend: false,
        name: '30-34',
        data: [null, {y: clientData.age_30_34[index][ansIndex]}], 
        color: '#5F82FF'
      }, {
        showInLegend: false,
        name: '26-29',
        data: [null, {y: clientData.age_26_29[index][ansIndex]}], 
        color: '#90A8FF'
      }, {
        showInLegend: false,
        name: '22-25',
        data: [null, {y: clientData.age_22_25[index][ansIndex]}], 
        color: '#7CC4FF'
      }, {
        showInLegend: false,
        name: '19-21',
        data: [null, {y: clientData.age_19_21[index][ansIndex]}], 
        color: '#67D9FF'
      }, {
        showInLegend: false,
        name: '15-18',
        data: [null, {y: clientData.age_15_18[index][ansIndex]}], 
        color: '#00F3FF'
      }, {
        showInLegend: false,
        name: '13-14',
        data: [null, {y: clientData.age_13_14[index][ansIndex]}], 
        color: '#00FF9E'
      }, {
        showInLegend: false,
        name: 'Unidentified',
        data: [null, null, {y: clientData.eduUnidentified[index][ansIndex]}], 
        color: '#D3D3D3'
      }, {
        showInLegend: false,
        name: 'Postgraduate/Doctorate',
        data: [null, null, {y: clientData.eduPostgrad[index][ansIndex]}], 
        color: '#FFFF00'
      }, {
        showInLegend: false,
        name: 'Master Degree',
        data: [null, null, {y: clientData.eduMaster[index][ansIndex]}], 
        color: '#DDA0DD'
      }, {
        showInLegend: false,
        name: 'Bachelor Degree (4 years college)',
        data: [null, null, {y: clientData.eduBachelor[index][ansIndex]}], 
        color: '#FFA500'
      }, {
        showInLegend: false,
        name: 'Associate Degree (2 years college)',
        data: [null, null, {y: clientData.eduAssociate[index][ansIndex]}], 
        color: '#B22222'
      }, {
        showInLegend: false,
        name: 'High School (year 9-12)',
        data: [null, null, {y: clientData.eduHS[index][ansIndex]}], 
        color: '#20B2AA'
      }, {
        showInLegend: false,
        name: 'Middle School (year 6-8)',
        data: [null, null, {y: clientData.eduMS[index][ansIndex]}], 
        color: '#00FF00'
      }, {
        showInLegend: false,
        name: 'Unidentified',
        data: [null, null, null, {y: clientData.incomeUnidentified[index][ansIndex]}], 
        color: '#D3D3D3'
      }, {
        showInLegend: false,
        name: 'Upper Class (+$150k annual, top 5%)',
        data: [null, null, null, {y: clientData.incomeUpper[index][ansIndex]}], 
        color: '#FF1493'
      }, {
        showInLegend: false,
        name: 'Upper Middle Class Tier 2 (+$100k annual, top 33%)',
        data: [null, null, null, {y: clientData.incomeUpperMiddle2[index][ansIndex]}], 
        color: '#D87093'
      }, {
        showInLegend: false,
        name: 'Upper Middle Class Tier 1 ($60,000-$100,000 annual)',
        data: [null, null, null, {y: clientData.incomeUpperMiddle1[index][ansIndex]}], 
        color: '#008080'
      }, {
        showInLegend: false,
        name: '"Middle" Middle Class ($32,500-$60,000 annual)',
        data: [null, null, null, {y: clientData.incomeMiddleMiddle[index][ansIndex]}], 
        color: '#2E8B57'
      }, {
        showInLegend: false,
        name: 'Lower Middle Class ($23,050-$32,500 annual)',
        data: [null, null, null, {y: clientData.incomeLowerMiddle[index][ansIndex]}], 
        color: '#FFEA64'
    }];

    var countries = [];
    for (j = 0; j < clientData.countries[index].length; j++)
      countries[j] = { showInLegend: false, name: clientData.countries[index][j], data: [null, null, null, null, {y: clientData.numCountries[index][ansIndex][j]}] };

    chartData = chartData.concat(countries);

    var chartId = '#dem-chart' + (index+1);
    var title = "";
    if (ansIndex == numAns) // if show all is clicked
      title = "Show All Demographics";
    else
      title = clientData.answerChoices[index][ansIndex];

    /**
     * Dark Unica theme for Highcharts JS
     * @author Torstein Honsi
     */

      // Load the fonts
      Highcharts.createElement('link', {
        href: 'http://fonts.googleapis.com/css?family=Monda',
        rel: 'stylesheet',
        type: 'text/css'
      }, null, document.getElementsByTagName('head')[0]);

      Highcharts.theme = {
        colors: ["#2b908f", "#90ee7e", "#f45b5b", "#7798BF", "#aaeeee", "#ff0066", "#eeaaee",
          "#55BF3B", "#DF5353", "#7798BF", "#aaeeee"],
        chart: {
        backgroundColor: {
        linearGradient: { x1: 0, y1: 0, x2: 1, y2: 1 },
          stops: [
            [0, '#3e3e40'],
            [1, '#0c79c1']
          ]
        },
        style: {
          fontFamily: "'Monda', sans-serif"
        },
        plotBorderColor: '#606063'
	},
	title: {
		style: {
			color: '#E0E0E3',
			textTransform: 'uppercase',
			fontSize: '20px'
		}
	},
	subtitle: {
		style: {
			color: '#E0E0E3',
			textTransform: 'uppercase'
		}
	},
	xAxis: {
		gridLineColor: '#707073',
		labels: {
			style: {
				color: '#E0E0E3'
			}
		},
		lineColor: '#707073',
		minorGridLineColor: '#505053',
		tickColor: '#707073',
		title: {
			style: {
				color: '#A0A0A3'

			}
		}
	},
	yAxis: {
		gridLineColor: '#707073',
		labels: {
			style: {
				color: '#E0E0E3'
			}
		},
		lineColor: '#707073',
		minorGridLineColor: '#505053',
		tickColor: '#707073',
		tickWidth: 1,
		title: {
			style: {
				color: '#A0A0A3'
			}
		}
	},
	tooltip: {
		backgroundColor: 'rgba(0, 0, 0, 0.85)',
		style: {
			color: '#F0F0F0'
		}
	},
	plotOptions: {
		series: {
			dataLabels: {
				color: '#B0B0B3'
			},
			marker: {
				lineColor: '#333'
			}
		},
		boxplot: {
			fillColor: '#505053'
		},
		candlestick: {
			lineColor: 'white'
		},
		errorbar: {
			color: 'white'
		}
	},
	legend: {
		itemStyle: {
			color: '#E0E0E3'
		},
		itemHoverStyle: {
			color: '#FFF'
		},
		itemHiddenStyle: {
			color: '#606063'
		}
	},
	credits: {
		enabled: false
	},
	labels: {
		style: {
			color: '#707073'
		}
	},

	drilldown: {
		activeAxisLabelStyle: {
			color: '#F0F0F3'
		},
		activeDataLabelStyle: {
			color: '#F0F0F3'
		}
	},

	navigation: {
		buttonOptions: {
			symbolStroke: '#DDDDDD',
			theme: {
				fill: '#505053'
			}
		}
	},

      // scroll charts
      rangeSelector: {
        buttonTheme: {
          fill: '#505053',
          stroke: '#000000',
          style: {
            color: '#CCC'
          },
          states: {
            hover: {
              fill: '#707073',
              stroke: '#000000',
              style: {
                color: 'white'
              }
            },
            select: {
              fill: '#000003',
              stroke: '#000000',
              style: {
                color: 'white'
              }
            }
          }
        },
        inputBoxBorderColor: '#505053',
        inputStyle: {
          backgroundColor: '#333',
        },
        labelStyle: {
          color: 'silver'
        }
      },

      navigator: {
        handles: {
          backgroundColor: '#666',
          borderColor: '#AAA'
        },
        outlineColor: '#CCC',
        maskFill: 'rgba(255,255,255,0.1)',
        series: {
          color: '#7798BF',
          lineColor: '#A6C7ED'
        },
        xAxis: {
          gridLineColor: '#505053'
	}
      },

      scrollbar: {
	barBackgroundColor: '#808083',
	barBorderColor: '#808083',
	buttonArrowColor: '#CCC',
	buttonBackgroundColor: '#606063',
	buttonBorderColor: '#606063',
	rifleColor: '#FFF',
	trackBackgroundColor: '#404043',
        trackBorderColor: '#404043'
      },

      // special colors for some of the
      legendBackgroundColor: 'rgba(0, 0, 0, 0.5)',
      background2: '#505053',
      dataLabelsColor: '#B0B0B3',
      textColor: '#C0C0C0',
      contrastTextColor: '#F0F0F3',
      maskColor: 'rgba(255,255,255,0.3)'
    };

    // Apply the theme
    Highcharts.setOptions(Highcharts.theme);
    /* End Dark Unica Theme */

    // renders the demographic chart  
    $(function () {
      $("body")
        $(chartId).highcharts({
          chart: {
            type: 'column'
          },
          title: {
            text: title
          },
          xAxis: {
            categories: ['Gender', 'Age', 'Education', 'Income Level', 'Country']
          },
          yAxis: {
            min: 0,
            title: {
              text: 'Total voting population'
            }
          },
          tooltip: {
            pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b> ({point.percentage:.0f}%)<br/>',
            shared: true,
            useHTML: true
          },
          plotOptions: {
            column: {
              stacking: 'percent',
              animation: false,
              shadow: false,
              marker: {
                enabled: false
              }
            }
          },
          series: chartData
        });
    });
    chartData = [];
  } // end chartRender

}); // end newConnect listener

} // end windows.onload

