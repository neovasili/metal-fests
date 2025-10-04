// Error Page JavaScript
function goBack() {
  // Try to go back in history, otherwise go to home
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = "/";
  }
}
