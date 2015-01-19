// wraps entire listener in this so that every page refresh is equivalent (for our purposes) to a new connection
window.onload = function() {

var socket = io();

var staticDirPath = ""; // for navigating up parent directories to root directory
for (z = 0; z < url.split("/").length - 1; z++) { staticDirPath += "../"; }

var numAns = genderUnidentified.length-1; // number of answer choices (also the answer choice number for show all)
var answerBtnClicked = numAns; // initializes answerBtnClicked to all "Show All" selection state
var cycleOn = false; // whether or not cycle feature is enabled
var cycleBtn = document.getElementById('cycle'); // the cycle button
var interval = null;

renderChart(numAns, numAns);

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
  if (data.postid == postid) { // checks if upvote event applies to this post
    // changes vote indication arrows
    if (data.neutral) {
      $('#downvote').attr('data-original-title', "").tooltip('hide');
      document.getElementById('downvoteimg').setAttribute('src', staticDirPath+"images/glyphicons_free/glyphicons/png/glyphicons_212_down_arrow.png");
      document.getElementById('downvotelink').setAttribute('style', 'cursor: pointer');
    }
    else { // is in upvoted position
      $('#upvote').attr('data-original-title', "Already upvoted!").tooltip('show');
      document.getElementById('upvoteimg').setAttribute('src', staticDirPath+"images/glyphicons_213_up_arrow_orange.png");
      document.getElementById('upvotelink').setAttribute('style', '');   
    }
  } // end postid check
}); // end upvote render listener

// updates vote arrows for logged in user
socket.on('downvoteRender', function (data) {
  if (data.postid == postid) { // checks if upvote event applies to this post
    // changes vote indication arrows
    if (data.neutral) {
      $('#upvote').attr('data-original-title', "").tooltip('hide');
      document.getElementById('upvoteimg').setAttribute('src', staticDirPath+"images/glyphicons_free/glyphicons/png/glyphicons_213_up_arrow.png");
      document.getElementById('upvotelink').setAttribute('style', 'cursor: pointer');
    }
    else { // is in downvoted position
      $('#downvote').attr('data-original-title', "Already downvoted!").tooltip('show');
      document.getElementById('downvoteimg').setAttribute('src', staticDirPath+"images/glyphicons_212_down_arrow_orange.png");
      document.getElementById('downvotelink').setAttribute('style', '');    
    }
  } // end postid check
}); // end downvote render listener

// upvote listener
socket.on('upvote', function (data) {
  if (data.postid == postid) { // checks if upvote event applies to this post
    // updates score
    $('#popoverUpvote').text(data.upvotes);
    $('#popoverDownvote').text(data.downvotes);
    document.getElementById('score').innerHTML = data.score;
    document.getElementById('score').setAttribute('data-original-title', "<b>" + (data.upvotes/(data.upvotes+data.downvotes)*100).toFixed(2) + "</b>% liked");
  } // end postid check
}); // end upvote listener

// downvote listener
socket.on('downvote', function (data) {
  if (data.postid == postid) { // checks if upvote event applies to this post
    // updates score
    $('#popoverDownvote').text(data.downvotes);
    $('#popoverUpvote').text(data.upvotes);
    document.getElementById('score').innerHTML = data.score;
    document.getElementById('score').setAttribute('data-original-title', "<b>" + (data.upvotes/(data.upvotes+data.downvotes)*100).toFixed(2) + "</b>% liked");
  } // end postid check
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
  $('#answerModal').modal('show');
}); // end answerModal listener

// answerRender listener changes Answer button to unclickable state for user that just answered the post
socket.on('answerRender', function (data) {
  if (data.postid == postid) { // checks if upvote event applies to this post
    // updates Answer button
    $('#answer').attr({'data-original-title': "Already answered!", 'rel': "popover", 'data-trigger': "hover", 'style': "background-color: #477447; color: White"});
    $('#answer').attr('id', 'alreadyAnswered');
  } // end postid check
}); // end answerRender listener

// answer listener updates post after a user submits an answer
socket.on('answer', function (data) {
  if (data.postid == postid) { // checks if upvote event applies to this post
    var chart = $('#dem-chart').highcharts();
    var radarChart = $('#radar-chart').highcharts();
    var numAns = genderUnidentified.length-1;

    // checks if client's post answer selection is on affected demographic chart - updates chart only if applicable

    // gender
    switch (data.demographics[0]) {
      case 'genderUnidentified':
        genderUnidentified[data.answerChoice] += 1;
        genderUnidentified[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns) // checks if user is on the graph to be updated or the show all graph
          chart.series[0].data[0].update({y: chart.series[0].data[0].y + 1});
        break;
      case 'genderMale':
        genderMale[data.answerChoice] += 1;
        genderMale[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[1].data[0].update({y: chart.series[1].data[0].y + 1});
        break;
      case 'genderFemale':
        genderFemale[data.answerChoice] += 1;
        genderFemale[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[2].data[0].update({y: chart.series[2].data[0].y + 1});
        break;
    } // end gender switch
    
    // age
    switch (data.demographics[1]) {
      case 'ageUnidentified':
        ageUnidentified[data.answerChoice] += 1;
        ageUnidentified[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[3].data[1].update({y: chart.series[3].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == 'UI <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(ageUnidentified[c]/ageUnidentified[numAns]).toFixed(2));
        break;
      case 'age_40':
        age_40[data.answerChoice] += 1;
        age_40[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[4].data[1].update({y: chart.series[4].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '40+ <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_40[c]/age_40[numAns]).toFixed(2));
        break;
      case 'age_35_39':
        age_35_39[data.answerChoice] += 1;
        age_35_39[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[5].data[1].update({y: chart.series[5].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '35-39 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_35_39[c]/age_35_39[numAns]).toFixed(2));
        break;
      case 'age_30_34':
        age_30_34[data.answerChoice] += 1;
        age_30_34[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[6].data[1].update({y: chart.series[6].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '30-34 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_30_34[c]/age_30_34[numAns]).toFixed(2));
        break;
      case 'age_26_29':
        age_26_29[data.answerChoice] += 1;
        age_26_29[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[7].data[1].update({y: chart.series[7].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '26-29 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_26_29[c]/age_26_29[numAns]).toFixed(2));
        break;
      case 'age_22_25':
        age_22_25[data.answerChoice] += 1;
        age_22_25[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[8].data[1].update({y: chart.series[8].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '22-25 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_22_25[c]/age_22_25[numAns]).toFixed(2));
        break;
      case 'age_19_21':
        age_19_21[data.answerChoice] += 1;
        age_19_21[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[9].data[1].update({y: chart.series[9].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '19-21 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_19_21[c]/age_19_21[numAns]).toFixed(2));
        break;
      case 'age_15_18':
        age_15_18[data.answerChoice] += 1;
        age_15_18[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[10].data[1].update({y: chart.series[10].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '15-18 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_15_18[c]/age_15_18[numAns]).toFixed(2));
        break;
      case 'age_13_14':
        age_13_14[data.answerChoice] += 1;
        age_13_14[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[11].data[1].update({y: chart.series[11].data[1].y + 1});
        if (document.getElementById('ageDropdown').innerHTML == '13-14 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[0].data[c].update(100*(age_13_14[c]/age_13_14[numAns]).toFixed(2));
        break;
    } // end age switch
    
    // education
    switch (data.demographics[2]) {
      case 'eduUnidentified':
        eduUnidentified[data.answerChoice] += 1;
        eduUnidentified[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[12].data[2].update({y: chart.series[12].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'UI <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduUnidentified[c]/eduUnidentified[numAns]).toFixed(2));
        break;
      case 'eduPostgrad':
        eduPostgrad[data.answerChoice] += 1;
        eduPostgrad[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[13].data[2].update({y: chart.series[13].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'Ph.D. <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduPostgrad[c]/eduPostgrad[numAns]).toFixed(2));
        break;
      case 'eduMaster':
        eduMaster[data.answerChoice] += 1;
        eduMaster[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[14].data[2].update({y: chart.series[14].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'Master <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduMaster[c]/eduMaster[numAns]).toFixed(2));
        break;
      case 'eduBachelor':
        eduBachelor[data.answerChoice] += 1;
        eduBachelor[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[15].data[2].update({y: chart.series[15].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'Bachelor <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduBachelor[c]/eduBachelor[numAns]).toFixed(2));
        break;
      case 'eduAssociate':
        eduAssociate[data.answerChoice] += 1;
        eduAssociate[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[16].data[2].update({y: chart.series[16].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'Associate <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduAssociate[c]/eduAssociate[numAns]).toFixed(2));
        break;
      case 'eduHS':
        eduHS[data.answerChoice] += 1;
        eduHS[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[17].data[2].update({y: chart.series[17].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'HS <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduHS[c]/eduHS[numAns]).toFixed(2));
        break;
      case 'eduMS':
        eduMS[data.answerChoice] += 1;
        eduMS[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[18].data[2].update({y: chart.series[18].data[2].y + 1});
        if (document.getElementById('eduDropdown').innerHTML == 'MS <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[1].data[c].update(100*(eduMS[c]/eduMS[numAns]).toFixed(2));
        break;
    } // end education switch

    // income
    switch (data.demographics[3]) {
      case 'incomeUnidentified':
        incomeUnidentified[data.answerChoice] += 1;
        incomeUnidentified[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[19].data[3].update({y: chart.series[19].data[3].y + 1});
        if (document.getElementById('incDropdown').innerHTML == 'UI <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeUnidentified[c]/incomeUnidentified[numAns]).toFixed(2));
        break;
      case 'incomeUpper':
        incomeUpper[data.answerChoice] += 1;
        incomeUpper[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[20].data[3].update({y: chart.series[20].data[3].y + 1});
        if (document.getElementById('incDropdown').innerHTML == 'Upper <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeUpper[c]/incomeUpper[numAns]).toFixed(2));
        break;
      case 'incomeUpperMiddle2':
        incomeUpperMiddle2[data.answerChoice] += 1;
        incomeUpperMiddle2[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[21].data[3].update({y: chart.series[21].data[3].y + 1});
        if (document.getElementById('incDropdown').innerHTML == 'UpMid2 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeUpperMiddle2[c]/incomeUpperMiddle2[numAns]).toFixed(2));
        break;
      case 'incomeUpperMiddle1':
        incomeUpperMiddle1[data.answerChoice] += 1;
        incomeUpperMiddle1[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[22].data[3].update({y: chart.series[22].data[3].y + 1});
        if (document.getElementById('incDropdown').innerHTML == 'UpMid1 <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeUpperMiddle1[c]/incomeUpperMiddle1[numAns]).toFixed(2));
        break;
      case 'incomeMiddleMiddle':
        incomeMiddleMiddle[data.answerChoice] += 1;
        incomeMiddleMiddle[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[23].data[3].update({y: chart.series[23].data[3].y + 1});
        if (document.getElementById('incDropdown').innerHTML == 'Middle <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeMiddleMiddle[c]/incomeMiddleMiddle[numAns]).toFixed(2));
        break;
      case 'incomeLowerMiddle':
        incomeLowerMiddle[data.answerChoice] += 1;
        incomeLowerMiddle[numAns] += 1;
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[24].data[3].update({y: chart.series[24].data[3].y + 1});
        if (document.getElementById('incMenuItem').innerHTML == 'LowMid <span class="caret"></span>')
          for (var c = 0; c < numAns; c++)
            radarChart.series[2].data[c].update(100*(incomeLowerMiddle[c]/incomeLowerMiddle[numAns]).toFixed(2));
        break;
    } // end income switch

    // update country
    var found = false; // whether or not client country is in current country list on chart
    for (c = 25; c < chart.series.length; c++) {
      if (data.demographics[4] == chart.series[c].name) { // check if client location is already in country list on chart
        numCountries[data.answerChoice][c-25] += 1; // increments count for that country (on answer)
        numCountries[numAns][c-25] += 1; // increments count for that country (total)
        if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns)
          chart.series[c].data[4].update({y: chart.series[c].data[4].y + 1});
        found = true;
      } // end if
    } // end for

    // adds new country to country list if not on there already
    if (!found && data.demographics[4] != null) {
      countries.push(data.demographics[4]);
      for (k = 0; k <= numAns; k++) {
        if (k == data.answerChoice || k == numAns)
          numCountries[k][countries.length-1] = 1;
        else
          numCountries[k][countries.length-1] = 0;
      } // end for
      if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns) // add (new) country to chart with value 1
        chart.addSeries({ showInLegend: false, name: data.demographics[4], data: [null, null, null, null, {y: 1}] });
      else // add (new) country to chart with value 0
        chart.addSeries({ showInLegend: false, name: data.demographics[4], data: [null, null, null, null, {y: 0}] });
    } // end if
    
    // updates answer data
    answerVotes[data.answerChoice] += 1;
    var total=0; for (var j=0;j<answerVotes.length;j++) total+=answerVotes[j];
    for (var j = 0; j < answerVotes.length; j++) {
      $('#progress' + parseInt(j+1)).css('width', 100*answerVotes[j]/total+'%').attr('aria-valuenow', 100*answerVotes[j]/total);
      $('#progressContent' + parseInt(j+1)).html('<b>' + letters[j] + '.</b> ' + parseInt(answerVotes[j]) + ' (' + (100*answerVotes[j]/total).toFixed(2) + '%)');
    } // end for
      
    // make sure geolocation succeeded and returned a valid latlng
    if (data.demographics[5] != null) {
      locations[data.answerChoice].push(data.demographics[5]); // updates answer specific latlng location array
      locations[numAns].push(data.demographics[5]); // updates total latlng location array
  
      // updates heatmap if client is focused on it
      if (data.answerChoice == answerBtnClicked || answerBtnClicked == numAns) { // checks if user is on the heatmap to be updated or the show all graph     
        pointArray.push(new google.maps.LatLng(data.demographics[5][0], data.demographics[5][1]));
      } // end if (heatmap focused)
    } // end if (null check)
    
  } // end postid check
}); // end answer listener

// upvote button listener
$("#upvote").on('click', function() {
  socket.emit('upvote', { postid : postid });
});

// downvote button listener
$("#downvote").on('click', function() {
  socket.emit('downvote', { postid : postid });
});

// ask button listener
document.getElementById('askBtn').onclick = function () {
  socket.emit('askRequest', {});
}

// answer CHOICE button listener (updates demographic chart and heatmap based on selected answer)
$(".answerChoice").on('click', function() {
  var id = this.id; // format: answer<ansIndex>
  var ansIndex = parseInt(id.substring(6, 7))-1;
  if (answerBtnClicked != ansIndex) { // only renders chart if not already selected
    while (pointArray.length > 0) // empties array to be reloaded
      pointArray.pop();
    for (z = 0; z < locations[ansIndex].length; z++)
      pointArray.push(new google.maps.LatLng(locations[ansIndex][z][0], locations[ansIndex][z][1]));
    answerBtnClicked = ansIndex;
    $('#answer').attr('data-original-title', "").tooltip('hide');
    renderChart(ansIndex, genderUnidentified.length-1); // last arg is numAns
  } // end if
}); // end answer CHOICE button listener

// showAll button listener
$("#showAll").on('click', function() {
  var numAns = genderUnidentified.length-1;
  if (answerBtnClicked != numAns) { // only renders chart if not already selected
    while (pointArray.length > 0) // empties array to be reloaded
      pointArray.pop();
    for (z = 0; z < locations[numAns].length; z++)
      pointArray.push(new google.maps.LatLng(locations[numAns][z][0], locations[numAns][z][1]));
    answerBtnClicked = numAns;
    renderChart(numAns, numAns);
  } // end if
}); // end showAll button listener

// answer button listener will send an answer request ONLY
$("#answer").on('click', function() {
  var id = this.id;
  if (id.indexOf('alreadyAnswered') == -1) { // checks if post has been answered
    var numAns = genderUnidentified.length-1;
    if (answerBtnClicked == numAns)
      $('#answer').attr('data-original-title', "Select an answer!").tooltip('show');
    else
      socket.emit('answerRequest', { postid : postid, postIndex : null }); // this page doesn't need postIndex as it is irrelevant, but the socket listener on server handles it anyways for post pages
  } // end if
}); // end answer button listener

// alreadyAnswered button listener
$("#alreadyAnswered").on('click', function() {
  $('#alreadyAnswered').tooltip('show');
}); // end alreadyAnswered button listener

// submitAnswer button listener
$(".submitAnswer").on('click', function() {
  var checkboxData = {};
  $('.demographicsModal input[name^="demographic"]').each( function() { // loads all checkbox states into an object to be sent to server
    checkboxData[this.name] = $(this).prop('checked');
  });
  $(this).attr('id', 'submitID'); // change modal submit button back to generic 'submitID'
  socket.emit('answer', { postid : postid, answerChoice : answerBtnClicked, checkboxData : checkboxData });
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

/* Radar Chart Event Handlers */

// cycle button listener - begins cycling through all demographic data on radar chart
$('#cycle').on('click', function () {
  var counter = 1;
  cycleOn = !cycleOn;
  var chart = $('#radar-chart').highcharts();
  if (cycleOn) {
    cycleBtn.setAttribute('style', 'margin-left: 40px; margin-top: -40px; background: Orange; color: Black');  // update button
    for (var c = 0; c < chart.series[0].data.length; c++) { // loads first age unidentified menu item
      if (ageUnidentified[answerVotes.length] == 0)
        chart.series[0].data[c].update(0);
      else
        chart.series[0].data[c].update(100*(ageUnidentified[c]/ageUnidentified[answerVotes.length]).toFixed(2));
    }
    document.getElementById('ageDropdown').innerHTML = 'UI <span class="caret"></span>';
    document.getElementById('eduDropdown').innerHTML = 'UI <span class="caret"></span>';
    document.getElementById('incDropdown').innerHTML = 'UI <span class="caret"></span>';
    chart.series[0].show(); chart.series[1].hide(); chart.series[2].hide();
    interval = setInterval( function() {
      switch (counter) {
        case 0:
          for (var c = 0; c < chart.series[0].data.length; c++) { // loads first age unidentified menu item
            if (ageUnidentified[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(ageUnidentified[c]/ageUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = 'UI <span class="caret"></span>';
          for (var c = 0; c < chart.series[2].data.length; c++) { 
            if (incomeUnidentified[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeUnidentified[c]/incomeUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'UI <span class="caret"></span>';
          chart.series[2].hide(); chart.series[0].show();
          break;
        case 1:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_13_14[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_13_14[c]/age_13_14[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '13-14 <span class="caret"></span>';
          break;
        case 2:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_15_18[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_15_18[c]/age_15_18[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '15-18 <span class="caret"></span>';
          break;
        case 3:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_19_21[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_19_21[c]/age_19_21[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '19-21 <span class="caret"></span>';
          break;
        case 4:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_22_25[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_22_25[c]/age_22_25[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '22-25 <span class="caret"></span>';
          break;
        case 5:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_26_29[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_26_29[c]/age_26_29[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '26-29 <span class="caret"></span>';
          break;
        case 6:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_30_34[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_30_34[c]/age_30_34[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '30-34 <span class="caret"></span>';
          break;
        case 7:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_35_39[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_35_39[c]/age_35_39[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '35-39 <span class="caret"></span>';
          break;
        case 8:
          for (var c = 0; c < chart.series[0].data.length; c++) {
            if (age_40[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(age_40[c]/age_40[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = '40+ <span class="caret"></span>';
          break;
        case 9:
          for (var c = 0; c < chart.series[0].data.length; c++) { // loads first age unidentified menu item
            if (ageUnidentified[answerVotes.length] == 0)
              chart.series[0].data[c].update(0);
            else
              chart.series[0].data[c].update(100*(ageUnidentified[c]/ageUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('ageDropdown').innerHTML = 'UI <span class="caret"></span>';
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduUnidentified[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduUnidentified[c]/eduUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'UI <span class="caret"></span>';
          chart.series[0].hide(); chart.series[1].show();
          break;
        case 10:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduMS[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduMS[c]/eduMS[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'MS <span class="caret"></span>';
          break;
        case 11:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduHS[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduHS[c]/eduHS[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'HS <span class="caret"></span>';
          break;
        case 12:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduAssociate[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduAssociate[c]/eduAssociate[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'Associate <span class="caret"></span>';
          break;
        case 13:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduBachelor[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduBachelor[c]/eduBachelor[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'Bachelor <span class="caret"></span>';
          break;
        case 14:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduMaster[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduMaster[c]/eduMaster[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'Master <span class="caret"></span>';
          break;
        case 15:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduPostgrad[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduPostgrad[c]/eduPostgrad[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'Ph.D. <span class="caret"></span>';
          break;
        case 16:
          for (var c = 0; c < chart.series[1].data.length; c++) {
            if (eduUnidentified[answerVotes.length] == 0)
              chart.series[1].data[c].update(0);
            else
              chart.series[1].data[c].update(100*(eduUnidentified[c]/eduUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('eduDropdown').innerHTML = 'UI <span class="caret"></span>';
          for (var c = 0; c < chart.series[2].data.length; c++) { 
            if (incomeUnidentified[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeUnidentified[c]/incomeUnidentified[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'UI <span class="caret"></span>';
          chart.series[1].hide(); chart.series[2].show();
          break;
        case 17:
          for (var c = 0; c < chart.series[2].data.length; c++) {
            if (incomeLowerMiddle[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeLowerMiddle[c]/incomeLowerMiddle[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'LowMid <span class="caret"></span>';
          break;
        case 18:
          for (var c = 0; c < chart.series[2].data.length; c++) {
            if (incomeMiddleMiddle[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeMiddleMiddle[c]/incomeMiddleMiddle[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'Middle <span class="caret"></span>';
          break;
        case 19:
          for (var c = 0; c < chart.series[2].data.length; c++) {
            if (incomeUpperMiddle1[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeUpperMiddle1[c]/incomeUpperMiddle1[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'UpMid1 <span class="caret"></span>';
          break;
        case 20:
          for (var c = 0; c < chart.series[2].data.length; c++) {
            if (incomeUpperMiddle2[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeUpperMiddle2[c]/incomeUpperMiddle2[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'UpMid2 <span class="caret"></span>';
          break;
        case 21:
          for (var c = 0; c < chart.series[2].data.length; c++) {
            if (incomeUpper[answerVotes.length] == 0)
              chart.series[2].data[c].update(0);
            else
              chart.series[2].data[c].update(100*(incomeUpper[c]/incomeUpper[answerVotes.length]).toFixed(2));
          }
          document.getElementById('incDropdown').innerHTML = 'Upper <span class="caret"></span>';
          break;
      } // end counter switch
      if (counter == 21)
        counter = 0;
      else
        counter++;
    }, 1000);
  } // end if (cycle clicked on)
  else {
    cycleBtn.setAttribute('style', 'margin-left: 40px; margin-top: -40px; background: Black; color: Orange');
    clearInterval(interval);
  } // end else (cycle clicked off)
}); // end cycle button click listener

// changes cycle button color when hovering over it
cycleBtn.addEventListener('mouseover', function() {
  if (!cycleOn)
    cycleBtn.setAttribute('style', "margin-left: 40px; margin-top: -40px; background: Black; color: White");
  else
    cycleBtn.setAttribute('style', "margin-left: 40px; margin-top: -40px; background: #FFCA2D; color: Black");
}, true); // end cycle button mouseover color changer

// changes color back
cycleBtn.addEventListener('mouseout', function() {
  if (!cycleOn)
    cycleBtn.setAttribute('style', "margin-left: 40px; margin-top: -40px; background: Black; color: Orange");
  else
    cycleBtn.setAttribute('style', "margin-left: 40px; margin-top: -40px; background: Orange; color: Black");
}, true); // end cycle button mouseout color changer

// dropdown menu item listener - updates dropdown menu title with selected option
$(".dropdown-menu li a").click( function() {
  updateDropdown(this.id, this.text, updateRadar);
}); // end dropdown updaters

var updateDropdown = function (id, text, callback) {
  switch (id) {
    case 'ageMenuItem':
      if (text == 'Unidentified')
        document.getElementById('ageDropdown').innerHTML = 'UI <span class="caret"></span>';
      else
        document.getElementById('ageDropdown').innerHTML = text + ' <span class="caret"></span>';
      break;
    case 'eduMenuItem':
      switch (text) {
        case 'Unidentified':
          document.getElementById('eduDropdown').innerHTML = 'UI <span class="caret"></span>';
          break;
        case 'Postgraduate/Doctorate':
          document.getElementById('eduDropdown').innerHTML = 'Ph.D. <span class="caret"></span>';
          break;
        case 'Master Degree':
          document.getElementById('eduDropdown').innerHTML = 'Master <span class="caret"></span>';
          break;
        case 'Bachelor Degree (4 years college)':
          document.getElementById('eduDropdown').innerHTML = 'Bachelor <span class="caret"></span>';
          break;
        case 'Associate Degree (2 years college)':
          document.getElementById('eduDropdown').innerHTML = 'Associate <span class="caret"></span>';
          break;
        case 'High School (year 9-12)':
          document.getElementById('eduDropdown').innerHTML = 'HS <span class="caret"></span>';
          break;
        case 'Middle School (year 6-8)':
          document.getElementById('eduDropdown').innerHTML = 'MS <span class="caret"></span>';
          break;
      } // end inner switch
      break;
    case 'incMenuItem':
      switch (text) {
        case 'Unidentified':
          document.getElementById('incDropdown').innerHTML = 'UI <span class="caret"></span>';
          break;
        case 'Upper Class (+$150k annual, top 5%)':
          document.getElementById('incDropdown').innerHTML = 'Upper <span class="caret"></span>';
          break;
        case 'Upper Middle Class Tier 2 (+$100k annual, top 33%)':
          document.getElementById('incDropdown').innerHTML = 'UpMid2 <span class="caret"></span>';
          break;
        case 'Upper Middle Class Tier 1 ($60,000-$100,000 annual)':
          document.getElementById('incDropdown').innerHTML = 'UpMid1 <span class="caret"></span>';
          break;
        case '"Middle" Middle Class ($32,500-$60,000 annual)':
          document.getElementById('incDropdown').innerHTML = 'Middle <span class="caret"></span>';
          break;
        case 'Lower Middle Class ($23,050-$32,500 annual)':
          document.getElementById('incDropdown').innerHTML = 'LowMid <span class="caret"></span>';
          break;
      } // end inner switch
      break;
  } // end switch
  callback(id, text);
} // end updateDropdown

// updates radar chart based on selected dropdown demographic (as callback after dropdown button title is updated)
var updateRadar = function (id, text) {
  var chart = $('#radar-chart').highcharts();
  if (text == 'Unidentified') { // switch for unidentified
    switch (id) {
      case 'ageMenuItem':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (ageUnidentified[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(ageUnidentified[c]/ageUnidentified[answerVotes.length]).toFixed(2));
        }
        break;
      case 'eduMenuItem':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduUnidentified[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduUnidentified[c]/eduUnidentified[answerVotes.length]).toFixed(2));
        }
        break;
      case 'incMenuItem':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeUnidentified[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeUnidentified[c]/incomeUnidentified[answerVotes.length]).toFixed(2));
        }
        break;
    } // end switch
  } else { // switch for unique dropdown selections
    switch (text) {
      case '40+':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_40[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_40[c]/age_40[answerVotes.length]).toFixed(2));
        }
        break;
      case '35-39':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_35_39[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_35_39[c]/age_35_39[answerVotes.length]).toFixed(2));
        }
        break;
      case '30-34':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_30_34[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_30_34[c]/age_30_34[answerVotes.length]).toFixed(2));
        }
        break;
      case '26-29':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_26_29[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_26_29[c]/age_26_29[answerVotes.length]).toFixed(2));
        }
        break;
      case '22-25':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_22_25[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_22_25[c]/age_22_25[answerVotes.length]).toFixed(2));
        }
        break;
      case '19-21':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_19_21[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_19_21[c]/age_19_21[answerVotes.length]).toFixed(2));
        }
        break;
      case '15-18':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_15_18[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_15_18[c]/age_15_18[answerVotes.length]).toFixed(2));
        }
        break;
      case '13-14':
        for (var c = 0; c < chart.series[0].data.length; c++) {
          if (age_13_14[answerVotes.length] == 0)
            chart.series[0].data[c].update(0);
          else
            chart.series[0].data[c].update(100*(age_13_14[c]/age_13_14[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Postgraduate/Doctorate':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduPostgrad[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduPostgrad[c]/eduPostgrad[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Master Degree':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduMaster[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduMaster[c]/eduMaster[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Bachelor Degree (4 years college)':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduBachelor[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduBachelor[c]/eduBachelor[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Associate Degree (2 years college)':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduAssociate[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduAssociate[c]/eduAssociate[answerVotes.length]).toFixed(2));
        }
        break;
      case 'High School (year 9-12)':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduHS[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduHS[c]/eduHS[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Middle School (year 6-8)':
        for (var c = 0; c < chart.series[1].data.length; c++) {
          if (eduMS[answerVotes.length] == 0)
            chart.series[1].data[c].update(0);
          else
            chart.series[1].data[c].update(100*(eduMS[c]/eduMS[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Upper Class (+$150k annual, top 5%)':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeUpper[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeUpper[c]/incomeUpper[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Upper Middle Class Tier 2 (+$100k annual, top 33%)':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeUpperMiddle2[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeUpperMiddle2[c]/incomeUpperMiddle2[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Upper Middle Class Tier 1 ($60,000-$100,000 annual)':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeUpperMiddle1[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeUpperMiddle1[c]/incomeUpperMiddle1[answerVotes.length]).toFixed(2));
        }
        break;
      case '"Middle" Middle Class ($32,500-$60,000 annual)':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeMiddleMiddle[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeMiddleMiddle[c]/incomeMiddleMiddle[answerVotes.length]).toFixed(2));
        }
        break;
      case 'Lower Middle Class ($23,050-$32,500 annual)':
        for (var c = 0; c < chart.series[2].data.length; c++) {
          if (incomeLowerMiddle[answerVotes.length] == 0)
            chart.series[2].data[c].update(0);
          else
            chart.series[2].data[c].update(100*(incomeLowerMiddle[c]/incomeLowerMiddle[answerVotes.length]).toFixed(2));
        }
    } // end switch
  } // end if-else
} // end updateRadar callback

// renders one demographic chart based on parameters
function renderChart (ansIndex, numAns) {
  var chartData = [{
      showInLegend: false,
      name: 'Unidentified',
      data: [{y: genderUnidentified[ansIndex]}],
      color: '#D3D3D3'
    }, {
      showInLegend: false,
      name: 'Male',
      data: [{y: genderMale[ansIndex]}], 
      color: '#00BFFF'
    }, {
      showInLegend: false,
      name: 'Female',
      data: [{y: genderFemale[ansIndex]}], 
      color: '#FF69B4'
    }, {
      showInLegend: false,
      name: 'Unidentified',
      data: [null, {y: ageUnidentified[ansIndex]}], 
      color: '#D3D3D3'
    }, {
      showInLegend: false,
      name: '40+',
      data: [null, {y: age_40[ansIndex]}], 
      color: '#2252FF'
    }, {
      showInLegend: false,
      name: '35-39', 
      data: [null, {y: age_35_39[ansIndex]}], 
      color: '#446DFF'
    }, {
      showInLegend: false,
      name: '30-34',
      data: [null, {y: age_30_34[ansIndex]}], 
      color: '#5F82FF'
    }, {
      showInLegend: false,
      name: '26-29',
      data: [null, {y: age_26_29[ansIndex]}], 
      color: '#90A8FF'
    }, {
      showInLegend: false,
      name: '22-25',
      data: [null, {y: age_22_25[ansIndex]}], 
      color: '#7CC4FF'
    }, {
      showInLegend: false,
      name: '19-21',
      data: [null, {y: age_19_21[ansIndex]}], 
      color: '#67D9FF'
    }, {
      showInLegend: false,
      name: '15-18',
      data: [null, {y: age_15_18[ansIndex]}], 
      color: '#00F3FF'
    }, {
      showInLegend: false,
      name: '13-14',
      data: [null, {y: age_13_14[ansIndex]}], 
      color: '#00FF9E'
    }, {
      showInLegend: false,
      name: 'Unidentified',
      data: [null, null, {y: eduUnidentified[ansIndex]}], 
      color: '#D3D3D3'
    }, {
      showInLegend: false,
      name: 'Postgraduate/Doctorate',
      data: [null, null, {y: eduPostgrad[ansIndex]}], 
      color: '#FFFF00'
    }, {
      showInLegend: false,
      name: 'Master Degree',
      data: [null, null, {y: eduMaster[ansIndex]}], 
      color: '#DDA0DD'
    }, {
      showInLegend: false,
      name: 'Bachelor Degree (4 years college)',
      data: [null, null, {y: eduBachelor[ansIndex]}], 
      color: '#FFA500'
    }, {
      showInLegend: false,
      name: 'Associate Degree (2 years college)',
      data: [null, null, {y: eduAssociate[ansIndex]}], 
      color: '#B22222'
    }, {
      showInLegend: false,
      name: 'High School (year 9-12)',
      data: [null, null, {y: eduHS[ansIndex]}], 
      color: '#20B2AA'
    }, {
      showInLegend: false,
      name: 'Middle School (year 6-8)',
      data: [null, null, {y: eduMS[ansIndex]}], 
      color: '#00FF00'
    }, {
      showInLegend: false,
      name: 'Unidentified',
      data: [null, null, null, {y: incomeUnidentified[ansIndex]}], 
      color: '#D3D3D3'
    }, {
      showInLegend: false,
      name: 'Upper Class (+$150k annual, top 5%)',
      data: [null, null, null, {y: incomeUpper[ansIndex]}], 
      color: '#FF1493'
    }, {
      showInLegend: false,
      name: 'Upper Middle Class Tier 2 (+$100k annual, top 33%)',
      data: [null, null, null, {y: incomeUpperMiddle2[ansIndex]}], 
      color: '#D87093'
    }, {
      showInLegend: false,
      name: 'Upper Middle Class Tier 1 ($60,000-$100,000 annual)',
      data: [null, null, null, {y: incomeUpperMiddle1[ansIndex]}], 
      color: '#008080'
    }, {
      showInLegend: false,
      name: '"Middle" Middle Class ($32,500-$60,000 annual)',
      data: [null, null, null, {y: incomeMiddleMiddle[ansIndex]}], 
      color: '#2E8B57'
    }, {
      showInLegend: false,
      name: 'Lower Middle Class ($23,050-$32,500 annual)',
      data: [null, null, null, {y: incomeLowerMiddle[ansIndex]}], 
      color: '#FFEA64'
  }];

  var countriesArray = [];
  for (j = 0; j < countries.length; j++)
    countriesArray[j] = { showInLegend: false, name: countries[j], data: [null, null, null, null, {y: numCountries[ansIndex][j]}] };

  chartData = chartData.concat(countriesArray);

  var title = "";
  if (ansIndex == numAns) // if show all is clicked
    title = "Show All Demographics";
  else
    title = answerChoices[ansIndex];

  /**
   * Dark Unica (modified) theme for Highcharts JS
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
                hideDelay : 0,
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
	}

    };

    // Apply the theme
  Highcharts.setOptions(Highcharts.theme);
  /* End Dark Unica Theme */

  // renders the demographic chart  
  $(function () {
    $("body")
      $('#dem-chart').highcharts({
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
        credits: {
          enabled: false
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

} // end windows.onload
