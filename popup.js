window.onload = function(){
  document.getElementById('signin').onclick = function() {
    document.getElementById('signin').disabled = true;
    chrome.runtime.sendMessage({action: "authorize"}, function(response) {
      // process response
    });
  };
};
