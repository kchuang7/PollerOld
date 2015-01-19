// wraps entire listener in this so that every page refresh is equivalent (for our purposes) to a new connection
window.onload = function() {

// checks that all form fields are filled before submitting question post fields
document.getElementById('submit').onclick = function() {
  if (!validateForm())
    alert('Please fill in all the fields.');
  else
    document.getElementById('submit').type = 'submit';
} // end submit button click handler

// check if all form fields are non-empty - returns true if this is the case
// also updates empty fields by highlighting the form field
function validateForm () {
  var filledFields = true; // are all the form fields filled?
  var qField = document.getElementById('inputQuestion'); // question form field
  // check if question field is empty
  if (qField.value === "") {
    qField.style.background = "#feffb9";
    filledFields = false;
  } else {
    qField.style.background = "white";
  } // end if-else

  var currentField; // current answer form field
  for (var i = 1; i <= 8; i++) {
    currentField = document.getElementById('inputAnswer'+i);
    if (currentField != null && currentField.value === "") {
      currentField.style.background = "#feffb9";
      filledFields = false;
    } else if (currentField != null) {
      currentField.style.background = "white";
    } // end else-if
  } // end for

  return filledFields;

} // end validateForm

} // end windows.onload
