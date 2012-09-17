
var http = require('http');
var querystring = require('querystring');
var util = require('../utils/util.js');


//Etat Toit 

var statusTable = [
	'Toit ferme',
	'Tympan Ouverture intermedaire',
	'Tympan ouverture totale',
	'Tympan fermeture1',
    'Tympan fermeture',
	'Toit fermeture',
	'Toit ouverture',
	'Toit ouvert',
	'Arret Urgence',
    'Tympan fermeture',
	'Park Telescope',
	'Toit ouverture',
	'Toit aeration',
	'Tympan Ouverture intermedaire'
	];


 function getUrl(options,callback){
		
	var body = "";
	function getUrlInternal(callback) {
		var req = http.request(options, function(res) {
			res.on('data', function(chunk) {
				body += chunk;
			});
			res.on('end', function() {
				callback(null, body);
			});
		});
		req.on('error', function(err) {
			callback(err);
		});
		req.on('socket', function(socket) {
			socket.setTimeout(7000);
			socket.on('timeout', function() {
				req.abort();
			});
		});
		req.end();
	}

	function repeater(i, callback) {
		if (i < 7) {
			getUrlInternal(function(err, result) {
				if (err)  util.wait(1000,function(){repeater(i + 1, callback)});
			     else callback(null, result)
			});
		} else callback(new Error('error cannot connect to :' + options.host));
	}
	repeater(0, callback);
}

function HandelRoof(action) {
	var post_data = querystring.stringify({
		'action': action,
	});
	var options = {
		host: '192.168.200.177',
		path: '/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': post_data.length
		}
	};

	var body = "";
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
	});
	req.write(post_data);
	req.end();
}


exports.getJson = function(callback) {
	var options = {
		host: '192.168.200.177',
		path: '/json/capteur',
	};
	getUrl(options, function(err, result) {
		if (err) callback(err);
		else callback(null, result);
	})
}

exports.getStatus = function(callback) {
	exports.getJson(function(err, result) {
		if (err) callback(err);
		else {
			ToitStatus = JSON.parse(result);
			callback(null, statusTable[ToitStatus.CurrentState]);
		}
	})
}


exports.Open = function(action, callback) {
	function isRoofOpen(callback) {
		exports.getStatus(function(err, result) {
			if (err) callback(err);
			else if ((action == "OuvertureA" && result != "Toit aeration") || ((action == "OuvertureP" || action == "OuvertureT") && result != "Toit ouvert")) {
				callback(new Error("Error occur in opening roof : ROOF IS NOT OPEN!"));
			} else {
				callback(null, "Roof Open");
				console.log("Roof Open");
			}

		});
	}
	
	exports.getStatus(function(err, result) {
		if (err) callback(err);
		else {
			if (result != "Toit ouvert") {
				HandelRoof(action);
				setTimeout(isRoofOpen, 80000, callback);
			} else
			 callback(null, "Roof Open");
			
		}
	});
}

exports.Close = function(callback) {
	function isRoofClosed(callback) {
		exports.getStatus(function(err, result) {
			if (err) callback(err);
			else if (result != 'Toit ferme') {
				callback(new Error("Error occur in closing roof : ROOF IS NOT CLOSED!"));
			} else{
				console.log("Roof close");
			 callback(null, "Roof close");
			}
		});
	}
	exports.getStatus(function(err, result) {
		if (err) callback(err);
		else {
			if (result != 'Toit ferme') {
				HandelRoof("Fermeture");
				setTimeout(isRoofClosed, 80000, callback);
			} else 
				callback(null, "Roof close");
			
		}
	});
}

exports.Stop = function(callback) {
			HandelRoof("Stop");
					
}

// Meteo interface

exports.getMeteo = function(callback) {
	var options = {
		host: '192.168.200.178',
		path: '/jsonSensor',
	};

	getUrl(options, function(err, result) {
		if (err) callback(err);
		else callback(null, JSON.parse(result));
	})
}




