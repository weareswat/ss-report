const async = require('async');
const google = require('googleapis');
const moment = require('moment-timezone');



var MyAirTable = require('./my_airtable');
var myAirTable = new MyAirTable();



var MyHrReport = function(){
	const _this = this;
	const _GOOGLE_SHEETS_DOC = "1ovahObQjyL4dekn489QyoobR-hH4aZPquqgwf4AEMoM";

	const SHEET_HEADCOUNT = "[AT] Headcount";
	const SHEET_EXITS = "[AT] Exits";
	const SHEET_NEW = "[AT] New";

	const START_ROW = 3;
	const BLOCK_ROWS = 300;
	
	const HC_LIST_COLUMN = "A";
	const HC_LIST_START_ROW = START_ROW;
	const START_YEAR = 2016;
	const END_YEAR = 2018;


	const COLUMNS = {
		"2018": [ "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P"]
		,"2017": [ "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z","AA","AB"] 
		,"2016": ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"] 
		// ,"2015": ["AO","AP","AQ","AR","AS","AT","AU","AV","AW","AX","AY","AZ"]
	};

	/***************************************************************************************************
	*	The Whole Thing
	****************************************************************************************************/
	this.update = function(auth){		
		myAirTable.getReportByCustomer(function(results){
			_this.updateHeadcountReport(auth, results.headcount, function(){
			_this.updateExitsReport(auth, results.exits, function(){
			_this.updateNewReport(auth, results.new, function(){	
				console.log("Finished airtable reports on google sheets");
			});
			});
			});
		});		
	}

	/***************************************************************************************************
	*	EXITS REPORT
	****************************************************************************************************/
	this.updateExitsReport = function(auth, report, callback){
		_this.updateReport(auth, SHEET_EXITS, report, callback);
	}

	this.updateHeadcountReport = function(auth, report, callback){
		_this.updateReport(auth, SHEET_HEADCOUNT, report, callback);
	}

	this.updateNewReport = function(auth, report, callback){
		_this.updateReport(auth, SHEET_NEW, report, callback);
	}


	/***************************************************************************************************
	*	HEADCOUNT REPORT
	****************************************************************************************************/
	this.updateReport = function(auth, sheet, report, callback){
		_this.writeCustomerList(auth, sheet, report, function(){
			//Write the values
			var column_start = COLUMNS["2018"][0];
			var column_end = COLUMNS["2016"][11];
			var values = _this.buildReportValues(report);
			var range = sheet + "!" + column_start + HC_LIST_START_ROW + ":" + column_end + (HC_LIST_START_ROW + report.customer_list.length + 1);

			_this.writeOnSheet(auth, range, values, function(){
				_this.timestampSheet(auth, sheet, function(){
					if (callback) callback();
				});								

			});			
		})
	}


	this.buildReportValues = function(report){
		var results = [];
		var customerIndex = {};
		results.push([]); // Total row

		for (var i = 0; i < report.customer_list.length; ++i){
			results.push([]);
			customerIndex[i] = report.customer_list[i];
		}
		
		results.push([]);

		for (var year = END_YEAR; year >= START_YEAR; --year )
		// for (var year = 2018; year >= 2018; --year )
		for (var i = 12; i >= 1; --i){
			results[0].push(report[year.toString()][i]["Total"]);
			for (var z = 0; z < report.customer_list.length; ++z){
				
				results[z+1].push(report[year.toString()][i][customerIndex[z]]);
			}
		}

		return results;
	}


	this.buildCustomerListValues = function(report){
		var results = [];
		for (var i = 0; i < report.customer_list.length; ++i){
			results.push([report.customer_list[i]]);
		}
		return results;
	}





	/***************************************************************************************************
	*	HELPERS
	****************************************************************************************************/

	this.writeCustomerList = function(auth, sheet, report, callback){
		//Write the customer list
		var values = _this.buildCustomerListValues(report);
		var range = sheet + "!A" + (HC_LIST_START_ROW + 1) +":A" + ((HC_LIST_START_ROW+1) + report.customer_list.length + 1);
		_this.writeOnSheet(auth, range, values, callback);

	}

	this.buildCustomerListValues = function(report){
		var results = [];
		for (var i = 0; i < report.customer_list.length; ++i){
			results.push([report.customer_list[i]]);
		}
		return results;
	}

	this.writeOnSheet = function(auth, range, values, callback){
		var sheets = google.sheets('v4');		
	    sheets.spreadsheets.values.update({
	    	auth: auth,
	    	spreadsheetId: _GOOGLE_SHEETS_DOC,
	    	range: range,
	    	valueInputOption: "USER_ENTERED", 
	    	resource: { 
	    		values: values }
	    	}, 
	    	(err, response) => {
	    		if (err) {
	    			console.log('GOOGLE SPREADSHEETS ERROR: The API returned an error: ' + err);
	    			// callback(null, cols.toString()); 
	    		}
	    		if (callback) callback();
	    	}
	    );
	}	

	this.timestampSheet = function(auth, sheet, callback){
		var now = new Date();
		var ts = moment(now, "Europe/Lisbon");
		var timestamp = ts.format("DD/MM hh:mm");
		var values = [[timestamp]];
		var range = sheet + "!A1:A1";

		_this.writeOnSheet(auth, range, values, callback);
	}	

	this.runAllYears = function(auth, job, callback){
		var date = new Date();
		var this_month = date.getMonth() + 1;
		var this_year = date.getFullYear();

		var years = [];
		var months = {};

		//See if the user passed a specific year to update on the console
		var start_year = START_YEAR;
		if (process.argv.length > 2){
			start_year = parseInt(process.argv[2]);
		}

		//puts all years on queue
		for (var y = start_year; y <= this_year; ++y){
			years.push(y);
		}

		//Start
		console.log("Updating support report from " + start_year + " until " + this_month + "/" + this_year);
		async.eachLimit(
			years, 2,
			function(current_year, callback){
				console.log("Processing year " + current_year);
				var parallel = [];
				var months = [];			
				var index = 0;

				for (var i = 1; i <= 12; ++i){
					if (current_year == this_year && i > (this_month)) break;		
					months.push(i);
					parallel.push(
						function(parallelCallback){
							var current_month = months[index++];
							job(auth, current_month, current_year, function(){
								parallelCallback(null, current_month);
							});
						}
					);
				}

				async.parallelLimit(parallel, 12, function(err, n){
					_this.timestampSheet(auth, function(){
						console.log("Finished updating year " + current_year + " on google sheets");
						if (callback) callback();
					});
				});
			},
			function(err){
				console.log("Finished processing all years");

			}
		);			
	}
}


module.exports = exports = MyHrReport;