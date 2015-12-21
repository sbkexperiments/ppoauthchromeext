var config = require('./ppConfig.json'),
    redirectUri = 'https://' + chrome.runtime.id + '.chromiumapp.org/provider_cb',
    redirectRe = new RegExp(redirectUri + '[#\?](.*)'),
    options = {
      interactive: true,
      url: 'https://www.paypal.com/webapps/auth/protocol/openidconnect/v1/authorize?client_id=' + config.clientId +
           '&response_type=code' +
           '&scope=openid+email+address+phone+profile' +
           '&redirect_uri=' + redirectUri
    };

console.log("URL:" + options.url);

var paypal = (function(){
  var request = require('request');
  
  var getAccessToken = function(authCode, callback) {
    request.post({
      headers: {'Content-Type' : 'application/x-www-form-urlencoded', 'Accept' : 'application/json', 'Accept-Language' : 'en_US'},
      url:     'https://api.paypal.com/v1/identity/openidconnect/tokenservice',
      auth:   {'user' : config.clientId , 'pass' : config.clientSecret},
      body:    'grant_type=authorization_code&code=' + authCode + '&redirect_uri=' + redirectUri
    }, function(error, response, body) {
      if (error) {
        console.log("ERROR:" + JSON.stringify(error));
        callback(error, null);
      }

      console.log("RESPONSE:" + JSON.stringify(response));
      console.log('BODY:' + JSON.stringify(body));

      if (response.statusCode === 200) {
        body = JSON.parse(body);
        callback(null, {access_token : body.access_token, refresh_token : body.refresh_token});
      } else {
        callback(response, null);
      }
    });
  };

  var getAccessTokenFromRefreshToken = function(refreshToken, callback) {
    request.post({
      headers: {'Content-Type' : 'application/x-www-form-urlencoded', 'Accept' : 'application/json', 'Accept-Language' : 'en_US'},
      url:     'https://api.paypal.com/v1/identity/openidconnect/tokenservice',
      auth:   {'user' : config.clientId , 'pass' : config.clientSecret},
      body:    'grant_type=refresh_token&refresh_token=' + refreshToken + '&redirect_uri=' + config.redirectUri
    }, function(error, response, body) {
      if (error) {
        console.log("ERROR:" + JSON.stringify(error));
        callback(error, null);
      }

      console.log("RESPONSE:" + JSON.stringify(response));
      console.log('BODY:' + JSON.stringify(body));

      if (response.statusCode === 200) {
        body = JSON.parse(body);
        callback(null, {access_token : body.access_token, refresh_token : body.refresh_token});
      } else {
        callback(response, null);
      }
    });
  };

  var getUserInfo = function(token, callback) {
    request.get({
      headers: {'Authorization' : 'Bearer ' + token, 'Accept' : 'application/json'},
      url:     'https://api.paypal.com/v1/identity/openidconnect/userinfo/?schema=openid'
    }, function(error, response, body) {
      if (error) {
        console.log("USER ERROR:" + JSON.stringify(error));
        callback(error, null);
      }

      console.log("USER RESPONSE:" + JSON.stringify(response));
      console.log('USER BODY:' + JSON.stringify(body));

      if (response.statusCode === 200) {
        body = JSON.parse(body);
        callback(null, body);
      } else {
        callback(response, null);
      }
    });
  };
 
  return {
    getAccessToken: getAccessToken,
    getUserInfo: getUserInfo
  };

})();

function parseRedirectFragment(fragment) {
  var pairs = fragment.split(/&/);
  var values = {};

  pairs.forEach(function(pair) {
    var nameval = pair.split(/=/);
    values[nameval[0]] = nameval[1];
  });
  
  return values;
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
  var action = request.action;
  var data = request.data;
  
  if (action === 'authorize') {
    chrome.identity.launchWebAuthFlow(options, function(redirect_url) {
      console.log(redirect_url);
      var res = {};
      var matches = redirect_url.match(redirectRe);
      console.log(matches);
      if (matches && matches.length > 1) {
        var params = parseRedirectFragment(matches[1]);
        var authCode = params.code;
        paypal.getAccessToken(authCode, function(err, response){
          console.log("AUTH TOKEN:", res);
          var authToken = response.access_token;
          chrome.storage.sync.set({'refreshToken': response.refresh_token}, function() {
            console.log('refreshToken saved');
            chrome.storage.sync.get('refreshToken', function(token){
              console.log('refreshToken retrieved:', token);
            });
          });
          paypal.getUserInfo(authToken, function(err, response){
            console.log("USER INFO:", response);
            sendResponse(response);  
          });
        });  
      }  
    });  
  }  
});




