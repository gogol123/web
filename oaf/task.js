
var mongo = require('mongodb');
	
	
var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('oaf', server);


exports.getTaskList= function (id,callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	var ObjectID = db.bson_serializer.ObjectID;

	db.collection('task', function(err, collection) {	
		collection.find({'sequence':id}).toArray(function(err, items) {
			if (err)
				callback(err)
			else{
				callback(null,items);
			}
		})
	})
	
	
}	

exports.getTaskListJson = function (id,callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	var ObjectID = db.bson_serializer.ObjectID;

	db.collection('task', function(err, collection) {	
		collection.find({'sequence':id}).toArray(function(err, items) {
			if (err)
				callback(err)
			else{
				callback(null,JSON.stringify(items));
			}
		})
	})
	
	
}	

exports.getSeqListJson = function(callback) {
	if (!db) {
		db.open(function(err, db) {
			if (!err) console.log("Connected to mongodb:oaf");
		});
	}
	db.collection('sequence', function(err, collection) {
		collection.find().toArray(function(err, items) {
			if (err) callback(err)
			else callback(null, JSON.stringify(items));
		})
	})
}

exports.save = function(task) {
	if (!db) {
		db.open(function(err, db) {
			if (!err) console.log("Connected to mongodb:oaf");
		});
	}
	db.collection('task', function(err, collection) {
		if (task._id) {
			var ObjectID = db.bson_serializer.ObjectID;
			db.collection('task', function(err, collection) {
				collection.remove({
					_id: ObjectID(task._id)
				});
			});
		}
		collection.insert(task, {
			safe: true
		}, function(err, result) {
			if (err) console.log('error saving task');
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

exports.removeTask = function(obj,callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	var ObjectID = db.bson_serializer.ObjectID;
	db.collection('task', function(err, collection) {
      collection.remove( {_id:ObjectID(obj)});
	});
}


exports.addSeq = function(seq) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	db.collection('sequence', function(err, collection) {
      collection.insert(seq, {safe:true}, function(err, result) {
		if(err)
			console.log('error saving seq');
      });
	});
}

exports.getSeq = function(id,callback) {
	if (!db) {
		db.open(function(err, db) {
		if(!err) {
			console.log("Connected to mongodb:oaf");
		}
		});
	}
	db.collection('sequence', function(err, collection) {
	var ObjectID = db.bson_serializer.ObjectID;
     collection.find({_id:ObjectID(id)}).toArray( function(err, result) {
		if (err)
				callback(err)
			else{
				callback(null,JSON.stringify(result));
			}
      });
	});
}

exports.getTaskJson = function(id, callback) {
	if (!db) {
		db.open(function(err, db) {
			if (!err) console.log("Connected to mongodb:oaf");
		});
	}
	db.collection('task', function(err, collection) {
		var ObjectID = db.bson_serializer.ObjectID;
		collection.find({
			_id: ObjectID(id)
		}).toArray(function(err, result) {
			if (err) callback(err)
			else {
				callback(null, JSON.stringify(result));
			}
		});
	});
}