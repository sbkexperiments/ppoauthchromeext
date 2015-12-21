# ppoauthchromeext

This extension demonstrates using PayPal OAuth in a chrome extension.

It uses browserify to generate background.bundle.js file used in manifest.json. So please do the following before loading the extension in the browser.

npm install request

browserify background.js -o background.bundle.js

After oauth flow the user info from PayPal is logged in the console of background page of the extension.

