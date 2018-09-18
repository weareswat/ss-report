var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var async = require('async');

const _GOOGLE_SECRET_FILE = "client_secret.json";

process.on("ETIMEDOUT", (reason, promise) => {
	console.log('UNHANDLED REJECTION ===>', reason);
});


/***************************************/
var MyHrReport = require("./lib/my_hr_report");
var myHrReport = new MyHrReport();

var ixGoogleSheets = require("./lib/my_google_sheets");
var myGoogleSheets = new ixGoogleSheets();

/***************************************/

// Load client secrets from a local file.
fs.readFile(_GOOGLE_SECRET_FILE, function processClientSecrets(err, content) {
  	if (err) {
    	console.log('Error loading client secret file: ' + err);
    	return;
	}	
	// Authorize a client with the loaded credentials, then call the
	// Google Sheets API.
	myGoogleSheets.authorize(JSON.parse(content), myHrReport.update, function(result){
		console.log("Bye!");
	});
});

