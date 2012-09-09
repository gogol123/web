
var mongo = require('mongodb');


	
var SlewAndExposeOption = {
	ObjectName : 'M27',
	RA		    : 0.0,
	Dec	        : 0.0,
	}
	
	
	
var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('oaf', server);


exports.getTaskListJson = function (callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	db.collection('task', function(err, collection) {	
		collection.find().toArray(function(err, items) {
			if (err)
				callback(err)
			else
				callback(null,JSON.stringify(items));
		})
	})
	
	
}	

exports.save = function(task) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	db.collection('task', function(err, collection) {
      collection.insert(task, {safe:true}, function(err, result) {
		if(err)
			console.log('error saving task');
      });
	});
}

exports.searchObject = function(obj,callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	db.collection('sac', function(err, collection) {
      collection.find( {OBJECT:obj}).toArray( function(err, result) {
		if(err)
			callback(err);
		else 
			callback(null,result);
      });
	});
}


