var async = require('async');

var roof = require('../utils/roof.js');
var telescope = require('../utils/tpl2.js');
var Location = require("../utils/maximjs").Location;
var task = require ('../task.js');

var ToitStatus;
var MountStatus;
var MeteoStatus;
var MeteoSeuil = {
	SkyTemp : 10.0,
	SkyTempCheck : 'on',
	Clarity : 20,
	ClarityCheck:'on',
	Darkness : 18.0,
	Rain : 2500,
	RainCheck:'on',
	};

var Osenbach = new Location(47.9926716666666735,7.2065583333333336);

var CounterMeteo=0;
function WatchMeteo(err,result){
		if (err)
			console.log("Error occur");
		else {
			MeteoStatus = result;
			MeteoStatus.seuil = MeteoSeuil;
			if ( (result.SkyTemp > 1.0) || (result.Rain > 2100)){
				console.log ("condition pour femeture meteo:"+CounterMeteo);
				CounterMeteo++;
			}
			else
				CounterMeteo=0;
		}
};
var MeteoTaskId = setInterval(roof.getMeteo,10000,WatchMeteo);

function Deg2hms(angle,ss) {
	var str="";
	tmpAngle = Math.abs(angle);
	h = Math.floor(tmpAngle);
	mn = (tmpAngle -h) *60;
	s = (mn - Math.floor(mn)) *60;
	if (angle < 0.0)
		str = "-";
	str += h+ss+Math.floor(mn)+"\""+Math.floor(s)+"'";
	return str;
	}

setInterval(roof.getJson,1000,function(err,result){
	if (err)
		console.log("Error getting roof status");
	else
		ToitSatus=result;
	});
	
telescope.NTMConnect();
setInterval(telescope.getNTMStatus,1000,function(err,result){
	if (err)
		console.log("Error getting telescope status");
	else {
		MountStatus=result;
		if (MountStatus.Track !=99 ) {
			beforeNoon = new Date();
			now = new Date();
			beforeNoon.setHours(11,0,0);
			MountStatus.transitTime =Osenbach.TransitTime(beforeNoon,MountStatus.PointingTargetRA*15,MountStatus.PointingTargetRA).transit;
			MountStatus.targetRA =Deg2hms( MountStatus.PointingTargetRA,"h");
			MountStatus.targetDec =Deg2hms( MountStatus.PointingTargetDec,"d");
			delta = (MountStatus.transitTime.getTime()-now.getTime())/1000
			MountStatus.timeRemaining = Math.floor(delta/3600)+"h"+(((delta/3600)-Math.floor(delta/3600))*60).toFixed(2);
		}
	}
	});

/*
 * GET home page.
 */

exports.index = function(req, res){
 if (req.user)
  res.render('index', { title: 'OAF Web control',user: req.user });
 else
	res.redirect('/login');
};

exports.login = function(req, res){
  res.render('login', {title: 'OAF Web control',user: req.user, message: req.flash('error')});
};

exports.logout = function(req, res){
req.logout();
  res.redirect('/');
};

exports.toit = function(req, res){
  res.render('toit', {title: 'OAF Web control',user: req.user, message: req.flash('error')});

};

exports.mount = function(req, res){
  res.render('mount', {title: 'OAF Web control',user: req.user, message: req.flash('error')});

};

exports.meteo = function(req, res){
  res.render('meteo', {title: 'OAF Web control',user: req.user, message: req.flash('error')});

};

exports.task = function(req, res){
  res.render('task', {title: 'OAF Web control',user: req.user, message: req.flash('error')});

};

exports.jsonRoof = function(req, res){
	res.writeHead(200, {'content-type': 'text/json' });
	res.write( ToitSatus);
	res.end('\n');

};

exports.jsonMount = function(req, res){
	res.writeHead(200, {'content-type': 'text/json' });
	res.write( JSON.stringify(MountStatus));
	res.end('\n');

};

exports.jsonMeteo = function(req, res){
	res.writeHead(200, {'content-type': 'text/json' });
	res.write( JSON.stringify(MeteoStatus));
	res.end('\n');

};

exports.jsonActionList = function(req, res){
	res.writeHead(200, {'content-type': 'text/json' });
	task.getTaskListJson(function (err,list){
		if(!err){
			res.write( list);
			res.end('\n');
		}
	});

};


exports.actionMount = function(req, res){

	function callback (err,result){
		if (err)
			console.log(err);
	}
	switch  (req.body.action) {
		case "Home" : 	telescope.park(callback);
						break;
		case "On"	: 	
						roof.getStatus(function (err,result) {
								if (err)
									console.log (err);
								else
									if (result == "Toit ouvert")
											telescope.powerOn(callback);
									else {
										console.log ("cannot power on mount aslong athe roof is not open");
										}
										
									
						});
						
									
									
						break;
		case "Off"	:  async.series({
							park: function(call){
								telescope.park(call);
							},
							poweroff: function(call){
								telescope.powerOff(call);
							},
						},
						function(err, results) {
						if (err)
							console.log(err)
						else
						console.log(null,"par & power off ok");
						});
						break;
		case "Clear":telescope.clearError(callback);
						break ;
		case "StartTrack":
						if (MountStatus.Track == 0)
							telescope.startTrack(callback);
						else
							telescope.stopTrack(callback);

						break ;
		default		:	
		
						console.log("unkown action");
		}

};

exports.actionRoof = function(req, res){

	function callback (err,result){
		if (err)
			console.log(err);
	}
	switch  (req.body.action) {
		case "ouvertureT" : 
		case "ouvertureP"  : roof.Open(req.body.action,callback);
						     break;
		case "fermeture"   :roof.Close(callback);
								break;
		case "stop"   :roof.Stop();
								break;

		default		:	
						console.log("unkown action");
		}

};


exports.actionMeteo = function(req, res){

	MeteoSeuil.SkyTemp = req.body.TempSky;
	MeteoSeuil.SkyTempCheck=req.body.TempSkyCheck;
	MeteoSeuil.Temp = req.body.Temp;
	MeteoSeuil.TempCheck=req.body.TempCheck;
	MeteoSeuil.Clarity = req.body.Delta;
	MeteoSeuil.ClarityCheck=req.body.DeltaCheck;
	MeteoSeuil.DHTHum = req.body.Hum;
	MeteoSeuil.DHTHumCheck=req.body.HumCheck;
	MeteoSeuil.Darkness = req.body.Obsc;
	MeteoSeuil.DarknessCheck=req.body.ObscCheck;
	MeteoSeuil.Rain = req.body.Rain;
	MeteoSeuil.RainCheck=req.body.RainChek;

	console.log(MeteoSeuil);
    res.redirect('/meteo');

};

exports.actionAddTask = function(req, res){

	var t = {};
	
	t.Owner= req.user.username;
	t.TaskName = req.body.TaskName;
	t.Action = req.body.action;

	task.save(t)
    res.redirect('/task');

};

exports.actionsearchObject = function(req, res){

	console.log('object search'+req.body.object);
	task.searchObject(req.body.object,function (err,result) {
		if (!err) {
		    var str = JSON.stringify(result);
			console.log(str);
			res.write(str);
			res.end();
		}
	});

};


