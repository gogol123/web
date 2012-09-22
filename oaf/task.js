
var mongo = require('mongodb');
	
	
var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('oaf', server);



function OpenDatabase() {
	if (!db) {
		db.open(function(err, db) {
			if (!err) console.log("Connected to mongodb:oaf");
		});
	}
	var ObjectID = db.bson_serializer.ObjectID;
}

exports.getTaskList = function(id, callback) {
	OpenDatabase();
	db.collection('task', function(err, collection) {
		collection.find({
			'sequence': id
		}).sort({
			Order: 1
		}).toArray(function(err, items) {
			if (err) callback(err)
			else {
				callback(null, items);
			}
		})
	})
}	

exports.getTaskListJson = function(id, callback) {
	export.getTaskList(id, function(err, result) {
		if (err) callback(err)
		else callback(null, JSON.stringify(items));
	});
}

exports.getSeqListJson = function(callback) {
	OpenDatabase();
	db.collection('sequence', function(err, collection) {
		collection.find().toArray(function(err, items) {
			if (err) callback(err)
			else callback(null, JSON.stringify(items));
		})
	})
}

exports.save = function(task) {
	OpenDatabase();
	db.collection('task', function(err, collection) {
		if (task._id) {
			task._id = ObjectID(task._id);
			console.log('update task' + task._id);
			db.collection('task', function(err, collection) {
				collection.update({
					'_id': task._id
				}, task, {
					upsert: true,
					safe: true
				}, function(err) {
					if (err) console.log(err);
				});
			});
		} else collection.insert(task, {
			safe: true
		}, function(err, result) {
			if (err) console.log('error saving task');
		});
	});
}

exports.searchObject = function(obj, callback) {
	OpenDatabase();
	db.collection('sac', function(err, collection) {
		collection.find({
			OBJECT: obj
		}).toArray(function(err, result) {
			if (err) callback(err);
			else callback(null, result);
		});
	});
}

exports.removeTask = function(obj, callback) {
	OpenDatabase();
	db.collection('task', function(err, collection) {
		collection.remove({
			_id: ObjectID(obj)
		});
	});
}

exports.reOrder = function(list) {
	OpenDatabase();
	db.collection('task', function(err, collection) {
		console.log(list.length);
		for (i = 0; i < list.length; i++) {
			console.log(list[i]);
			id = ObjectID(list[i]);
			db.collection('task', function(err, collection) {
				collection.update({
					'_id': id
				}, {
					'$set': {
						'Order': i + 1
					}
				}, {
					safe: true
				}, function(err) {
					if (err) console.log(err);
				});
			});
		}
	});
}


exports.addSeq = function(seq) {
	OpenDatabase();
	db.collection('sequence', function(err, collection) {
		collection.insert(seq, {
			safe: true
		}, function(err, result) {
			if (err) console.log('error saving seq');
		});
	});
}

exports.getSeq = function(id, callback) {
	OpenDatabase();
	db.collection('sequence', function(err, collection) {
		collection.find({
			_id: ObjectID(id)
		}).toArray(function(err, result) {
			if (err) callback(err)
			else callback(null, JSON.stringify(result));
		});
	});
}

exports.getTaskJson = function(id, callback) {
	OpenDatabase();
	db.collection('task', function(err, collection) {
		collection.find({
			_id: ObjectID(id)
		}).toArray(function(err, result) {
			if (err) callback(err)
			else {
				callback(null, JSON.stringify(result));
				console.log('getTaskJson : ' + JSON.stringify(result));
			}
		});
	});
}