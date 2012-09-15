var async = require('async');
var sio = require('socket.io');


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
 	if (!req.session.CurrentSequenceId)
  		res.render('index', { seqid:0 ,title: 'OAF Web control',user: req.user });
  	else
  		 res.render('index', { seqid:req.session.CurrentSequenceId, title: 'OAF Web control',user: req.user });

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
	if (!req.session.CurrentSequenceId)
		 res.render('task', {seqid: 0,title: 'OAF Web control',user: req.user, message: req.flash('error')});
	else
  		res.render('task', {seqid:req.session.CurrentSequenceId,title: 'OAF Web control',user: req.user, message: req.flash('error')});
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
	task.getTaskListJson(req.query["id"],function (err,list){
		if(!err){
			res.writeHead(200, {'content-type': 'text/json' });
			res.write( list);
			req.session=null;
			res.end();
		}
	});
};

exports.jsonSeqList = function(req, res){
	res.writeHead(200, {'content-type': 'text/json' });
	task.getSeqListJson(function (err,list){
		if(!err){
			res.write( list);
			res.end('\n');
		}
	});
};
exports.jsonSeq = function(req, res){

	res.writeHead(200, {'content-type': 'text/json' });
	task.getSeq(req.query["id"],function (err,list){
		if(!err){
			res.write( list);
		}
	req.session.CurrentSequenceId=req.query["id"];
	res.end();



	});

};


exports.actionMount = function(req, res){

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
								console.log ("cannot power on mount as long athe roof is not open");
								res.write('Power on impossible si le toit est fermé');
								res.end();
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
	req.session = null; 
    res.redirect('/meteo');

};

exports.actionAddTask = function(req, res){

	var t = {};
	var Target = {};
	var ImageOption = new Array();
	
	t.Owner= req.user.username;
	t.Action = req.body.action;
	t.sequence = req.body.objectId;

	if (req.body.action == 'Slew' || req.body.action == 'Slew and Expose' ){
		Target.Name = req.body.name;
		Target.RA = req.body.RA;
		Target.DEC = req.body.DEC;
		t.Target = Target;

	}

	if(req.body.action == 'Slew and Expose'){
		if (req.body.ImageCheck0) {
			ImageOption[0] = {};
			ImageOption[0].Exposure=req.body.ImageExposure0;
			ImageOption[0].Filter=req.body.ImageFilter0;
			ImageOption[0].Repeate=req.body.ImageRepeate0;
			ImageOption[0].Bin=req.body.ImageBin0;
		}
		if (req.body.ImageCheck1) {
			ImageOption[1] = {};
			ImageOption[1].Exposure=req.body.ImageExposure0;
			ImageOption[1].Filter=req.body.ImageFilter0;
			ImageOption[1].Repeate=req.body.ImageRepeate0;
			ImageOption[1].Bin=req.body.ImageBin0;
		}
		if (req.body.ImageCheck2) {
			ImageOption[2] = {};
			ImageOption[2].Exposure=req.body.ImageExposure0;
			ImageOption[2].Filter=req.body.ImageFilter0;
			ImageOption[2].Repeate=req.body.ImageRepeate0;
			ImageOption[2].Bin=req.body.ImageBin0;
		}
		if (req.body.ImageCheck3) {
			ImageOption[3] = {};
			ImageOption[3].Exposure=req.body.ImageExposure0;
			ImageOption[3].Filter=req.body.ImageFilter0;
			ImageOption[3].Repeate=req.body.ImageRepeate0;
			ImageOption[3].Bin=req.body.ImageBin0;
		}
		t.ImageOption= ImageOption;
	}
	
	task.save(t)

	console.log('add task');
	req.session = null; 
    res.redirect('/task');
    res.end();
    


};

exports.actionsearchObject = function(req, res){

	console.log('object search'+req.body.object);
	task.searchObject(req.body.object,function (err,result) {
		if (!err) {
		    var str = JSON.stringify(result);
			res.write(str);
			res.end();
		}
	});

};
exports.actiondeleteTask = function(req, res){

	console.log('delete task :'+req.body.id);
	task.removeTask(req.body.id,function (err,result) {
	req.session = null; 
	});
};


exports.actionAddSeq = function(req, res){

	var seq = {};
	
	seq.Owner= req.user.username;
	seq.name = req.body.seqname;

	task.addSeq(seq);
	req.session = null; 
	res.redirect('/task');


}

var io;
var socket;



exports.actionStartSequence = function(req, res){
	res.redirect('/');
	req.session=null;
	res.end();
    task.getTaskList(req.body.id,function (err,list){
		if(!err){
			async.forEachSeries(list,function(item,callback){
				ProcessTask(item,callback);
				},
				function(err){
					console.log(err)
			});
		}
	});
}

function ProcessTask(item,callback){
	switch (item.Action) {
			case  'Ouverture Toit':
										socket.broadcast.emit('UpdateSequence',{msg:'ouverture toit'});
										roof.Open("OuvertureP",callback);
										break;
			case  'Fermeture Toit':
										socket.broadcast.emit('UpdateSequence',{msg:'fermeture toit'});
										roof.Close(callback);
										break;

			case  'Power on monture':
										socket.broadcast.emit('UpdateSequence',{msg:'monture power on'});
										telescope.powerOn(callback);
										break;
			case  'Power off monture':
								        socket.broadcast.emit('UpdateSequence',{msg:'monture power off'});
								        telescope.park(function (err){
								        	if (!err)
												telescope.powerOff(callback);
											else
												callback(err);
										});
										break;

			case  'Slew' :
										socket.broadcast.emit('UpdateSequence',{msg:'telescope slew: '+item.Target.RA+' '+item.Target.DEC});
										telescope.slew(item.Target.RA,item.Target.DEC,Osenbach,callback);
										break;
			case 'Slew and Expose':     // slew to target
								        socket.broadcast.emit('UpdateSequence',{msg:'telescope slew: '+item.Target.RA+' '+item.Target.DEC});
										telescope.slew(item.Target.RA,item.Target.DEC,Osenbach,function(err){
										//Expose
											async.forEachSeries(item.ImageOption,function(image,callback2){
												var options = {};
												options.ObjectName = item.Target.Name;
												options.Repeate = image.Repeate;
												options.Binning = image.Bin;
												option.Filter = decodeFilter(image.Filter)
												ccd.Expose(item.ImageOption,callback2);
												},
												function(err){
													callback2(err)
												});
										});
										break;
			default :
										callback('Error ProcessTask :default case');
	}
}

function decodeFilter(filterName){
	switch (filterName){
		case 'Luminance': return 3;
		case 'Red' 		: return 0;
		case 'Green' 	: return 1;
		case 'Blue' 	: return 2;
		case 'Halpha' 	: return 4;
		default :
					console.log('error decoding filter :'+filterName+' unknow');

	}
}
//websocket

exports.setIo = function(i){
	io = i;

	io.sockets.on('connection', function (sock) {
		socket=sock;
  		sock.emit('UpdateSequence', { hello: 'world' });
  });
}

