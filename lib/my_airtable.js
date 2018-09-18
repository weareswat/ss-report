var Airtable = require('airtable');
var moment = require('moment');

var MyAirTable = function(){
	const _AIRTABLE_KEY = "key4KvCflWwljR6kh";
	const _START_YEAR = 2016;

	var _this = this;
	var base = new Airtable({apiKey: _AIRTABLE_KEY}).base('appRKtFJJPcG5Tmwf');

	this.getReportByCustomer = function(callback){
		var results = {};

		_this.getExitsByCustomer(function(report){
			results["exits"] = report;
			_this.getHeadcountByCustomer(function(report){
				results["headcount"] = report;	
				_this.getNewByCustomer(function(report){
					results["new"] = report;

					callback(results);
				});
			});			
		})

	}

	// ********** GENERIC *******

	this.getSomethingByCustomer = function(callback, criteria){
		var start_year = _START_YEAR;
		var totalResults = {};

		_this.getCustomerAllocation(function(allocations){
			var customer_list = _this.helperBuildCustomerList(allocations);

			for (var year = start_year; year <= moment().year(); ++year){
				totalResults[year] = {};
				for (var i = 1; i < 13; ++i ){
					var results = _this.helperCriteria(i, year, allocations, criteria);

					totalResults[year][i] = results;
				}				
			}

			totalResults["customer_list"] = customer_list;			
			callback(totalResults);
		});
	}	

	this.helperCriteria = function(month, year, allocations, criteria){
		var start_month = month < 10 ? "0" + month : month;
		var end_month = month == 12 ? "01" : (month+1) < 10 ? "0" + (month+1) : (month+1);

		var start = year + "-" + start_month + "-01";
		var end = month == 12 ? (year+1) + "-" + end_month + "-01" : (year) + "-" + end_month + "-01"; 

		var beginCurrentMonth = moment(start);
		var endCurrentMonth = moment(end);

		var results = { Total:0 };

		allocations.forEach(function(record){
			var begin = new Date(record.begin);
			var end = record.end == undefined ? record.end : new Date(record.end);

			// if (record.end != undefined){
			var test = criteria(begin, end, beginCurrentMonth, endCurrentMonth);
			results[record.customer] = results[record.customer] == undefined ? test : results[record.customer] + test;
			results.Total += test;				
			// }			
		});

		return results;
	}	

	// ********** GENERIC *******

	this.getNewByCustomer = function(callback){
		_this.getSomethingByCustomer(callback, function(begin, end, beginCurrentMonth, endCurrentMonth){
			if (begin > beginCurrentMonth && begin < endCurrentMonth){
				return 1;
			}
			return 0;			
		});
	}	


	this.getExitsByCustomer = function(callback){
		_this.getSomethingByCustomer(callback, function(begin, end, beginCurrentMonth, endCurrentMonth){
			if (end > beginCurrentMonth && end < endCurrentMonth){
				return 1;
			}
			return 0;			
		});
	}	


	this.getHeadcountByCustomer = function(callback){
		_this.getSomethingByCustomer(callback, function(begin, end, beginCurrentMonth, endCurrentMonth){
			if (begin < beginCurrentMonth && (end == undefined || end > endCurrentMonth)){
				return 1;
			}
			return 0;			
		});
	}	



	this.helperBuildCustomerList = function(allocations){
		var list = [];
		allocations.forEach(function(record){
			list.push(record.customer);
		});

		return list.filter(function(value, index, self){
			return self.indexOf(value) === index;
		}).sort();
	}


	this.getCustomerAllocation = function(callback){
		var results = [];
		base('Customer Allocation').select({
		    view: "Everything"
		}).eachPage(function page(records, fetchNextPage) {

		    records.forEach(function(record) {
		    	var row = {};
		    	row.customer = record.get("Customer Name");
		    	row.person = record.get("Person Name");
		    	row.begin = record.get("Begin");
		    	row.end = record.get("End");

				// console.log(row);
				if (row.customer != undefined && row.person != undefined){
					results.push(row);
				}
			    
		    });

			fetchNextPage();

		}, function done(err) {
		    if (err) { console.error(err); return; }

		    callback(results);
		});
	}
}

module.exports = exports = MyAirTable;