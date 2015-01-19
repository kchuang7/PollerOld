// wraps entire listener in this so that every page refresh is equivalent (for our purposes) to a new connection
window.onload = function() {

var socket = io();

// not logged in listener : creates popup box notifying user that they are not logged in and cannot use a certain feature
socket.on('notLoggedIn', function (data) {
  if (data.feature == 'ask')
    $('#notLoggedInAsk').modal('show');
}); // end not logged in listener

// redirectAsk listener - redirects to community ask page if user is logged in
socket.on('redirectAsk', function (data) {
  window.location.href = "/c/" + community + "/ask";
}); // end redirectAsk listener

// ask button listener
document.getElementById('askBtn').onclick = function () {
  socket.emit('askRequest', {});
}

} // end windows.onload
