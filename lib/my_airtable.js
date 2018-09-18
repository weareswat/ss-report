var Airtable = require('airtable');
var moment = require('moment');

var MyAirTable = function(){
	const _AIRTABLE_KEY = "key4KvCflWwljR6kh";
	const _START_YEAR = 2016;

	var _this = this;
	var base = new Airtable({apiKey: _AIRTABLE_KEY}).base('appRKtFJJPcG5Tmwf');
	
	this.getHeadcountByCustomer = function(callback){
		var start_year = _START_YEAR;
		var totalResults = {};

		_this.getCustomerAllocation(function(allocations){
			var customer_list = _this.helperBuildCustomerList(allocations);

			for (var year = start_year; year <= moment().year(); ++year){
				totalResults[year] = {};
				for (var i = 1; i < 13; ++i ){
					var results = _this.helperCountActiveOnMonthAndYearByCustomer(i, year, allocations);
					totalResults[year][i] = results;
				}				
			}

			totalResults["customer_list"] = customer_list;			
			callback(totalResults);
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

	this.helperCountActiveOnMonthAndYearByCustomer = function(month, year, allocations){
		var start_month = month < 10 ? "0" + month : month;
		var end_month = month == 12 ? "01" : (month+1) < 10 ? "0" + (month+1) : (month+1);

		var start = year + "-" + start_month + "-01";
		var end = month == 12 ? (year+1) + "-" + end_month + "-01" : (year) + "-" + end_month + "-01"; 

		var beginCurrentMonth = moment(start);
		var endCurrentMonth = moment(end);

		var results = { Total:0 };

		allocations.forEach(function(record){
			var begin = new Date(record.begin);
			var end = new Date(record.end);
			// console.log(end + " > " + endCurrentMonth);
			// console.log(begin < beginCurrentMonth && end > endCurrentMonth);
			if (begin < beginCurrentMonth && (record.end == undefined || end > endCurrentMonth)){
				if ( results[record.customer] == undefined){
					results[record.customer] = 1;	
				}
				else{
					results[record.customer]++;
				}	
				results.Total++;			
			}
			
		});

		return results;
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