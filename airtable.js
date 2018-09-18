var MyAirTable = require("./lib/my_airtable");
var myAirTable = new MyAirTable();




myAirTable.getHeadcountByCustomer(function(results){
			console.log(results);
		});	