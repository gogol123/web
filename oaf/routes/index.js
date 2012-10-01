var async = require('async');
var sio = require('socket.io');
var exec = require('child_process').exec


var roof = require('../utils/roof.js');
var telescope = require('../utils/tpl2.js');
var Location = require("../utils/maximjs").Location;
var _skype = require("../utils/maximjs").SkypeJS;
var ccd = require('../utils/ccd.js');

var task = require ('../task.js');

var ToitStatus;
var MountStatus;
var MeteoStatus;


var skype = new _skype();

var MeteoSeuil = {
	SkyTemp : 10.0,
	SkyTempCheck : 'on',
	Clarity : 20,
	ClarityCheck:'on',
	Darkness : 18.0,
	Rain : 2500,
	RainCheck:'on',
	};

var seqText = new Array();
var seqIndex = 0
var seqProgress = new Array();
var seqProgressIndex = 0;



var statusTable = [	'Toit ferme', 
					'Tympan Ouverture intermedaire', 
					'Tympan ouverture totale', 
					'Tympan fermeture', 
					'Tympan fermeture', 
					'Toit fermeture', 
					'Toit ouverture', 
					'Toit ouvert', 
					'Arret Urgence', 
					'Tympan fermeture', 
					'Park Telescope', 
					'Toit ouverture', 
					'Toit aeration', 
					'Tympan Ouverture intermedaire'];

var Osenbach = new Location(47.9926716666666735,7.2065583333333336);

var CounterMeteo=0;
function WatchMeteo(err,result){
		if (err) {
			now = new Date();
			console.log(now.getHours()+":"+now.getMinutes()+":"+now.getSeconds()+ "  Error getting meteo status");
			console.log(err);
		}
		else {
			MeteoStatus = result;
			MeteoStatus.seuil = MeteoSeuil;
			if  ((MeteoSeuil.SkyTempCheck && (result.SkyTemp > MeteoSeuil.SkyTemp)) ||
				 (MeteoSeuil.ClarityCheck && ( (result.MLXAmb-result.SkyTemp) < MeteoSeuil.Clarity)) ||
				 (MeteoSeuil.DHTHumCheck && ( result.DHTHum > MeteoSeuil.DHTHum)) ||
				 (MeteoSeuil.DarknessCheck && ( result.Darkness > MeteoSeuil.Darkness)) ||
				 (MeteoSeuil.DarknessCheck && ( result.Darkness > MeteoSeuil.Darkness)) ) {
			CounterMeteo++;
			console.log ("condition pour femeture meteo:"+CounterMeteo);

		}
	}
};
var MeteoTaskId = setInterval(roof.getMeteo,10000,WatchMeteo);



setInterval(roof.getJson, 2000, function(err, result) {
	if (err) {
		now = new Date();
		console.log(now.getHours() + ":" + now.getMinutes() + ":" + now.getSeconds() + "  Error getting roof status");
		console.log(err);
	} else {
		ToitSatus = JSON.parse( result);
		ToitSatus.TextStatus = statusTable[ToitSatus.CurrentState];
	}
});
	
telescope.NTMConnect();
var filpDetected = false;
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
			MountStatus.timeRemaining = delta;
		}
		if (isExposing && MountStatus.Track ==0) {
			console.log('telescope stop tracking during Exposure');
			if (delta < 200) {
				console.log('telescope stop during exposue : Mediran flip detected');
				if (!filpDetected){
				   setTimeout(telescope.startTrack,300000);
				   filpDetected = true;
				}
			}
		}
		else filpDetected = false;
	}
	});

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
	res.write(JSON.stringify( ToitSatus));
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


exports.jsonSeq = function(req, res) {
	res.writeHead(200, {'content-type': 'text/json'});
	task.getSeq(req.query["id"], function(err, list) {
		if (!err) res.write(list);
		req.session.CurrentSequenceId = req.query["id"];
		res.end();
	});
};

exports.jsonTask = function(req, res) {
	res.writeHead(200, {'content-type': 'text/json'});
	task.getTaskJson(req.query["id"], function(err, list) {
		if (!err) res.write(list);
		res.end();
	});
};

exports.actionMount = function(req, res){

	switch  (req.body.action) {
		case "Home" : 	telescope.park(function (err){
								if (err) {
									console.log (err);
									res.write(err.message);
									res.end();
								}
							 });
						break;
		case "On"	: 	
						telescope.powerOn(function (err){
								if (err) {
									console.log (err);
									res.write(err.message);
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
		case "Clear":telescope.clearError();
						break ;
		case "StartTrack":
						if (MountStatus.Track == 0)
							telescope.startTrack();
						else
							telescope.stopTrack();

						break ;
		default		:	
		
						console.log("action mount :unkown action "+req.body.action);
		}

};

exports.actionRoof = function(req, res){

	function callback (err,result){
		if (err)
			console.log(err);
	}
	switch  (req.body.action) {
		case "ouvertureA" : 
		case "ouvertureT" : 
		case "ouvertureP"  : roof.Open(req.body.action,callback);
						     break;
		case "fermeture"   :roof.Close(callback);
								break;
		case "stop"   :roof.Stop();
								break;

		default		:	
						console.log("action roof unkown action "+req.body.action);
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

	req.session = null; 
    res.redirect('/meteo');

};

exports.actionAddTask = function(req, res){

	var t = {};
	var Target = {};
	var ImageOption = new Array();
	
	t.Owner= req.user.username;
	t.Action = req.body.action;
	t.sequence = req.body.SeqObjectId;
	t.Order = req.body.indice;
	if(req.body.objectId)
		t._id = req.body.objectId;

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
			ImageOption[1].Exposure=req.body.ImageExposure1;
			ImageOption[1].Filter=req.body.ImageFilter1;
			ImageOption[1].Repeate=req.body.ImageRepeate1;
			ImageOption[1].Bin=req.body.ImageBin1;
		}
		if (req.body.ImageCheck2) {
			ImageOption[2] = {};
			ImageOption[2].Exposure=req.body.ImageExposure2;
			ImageOption[2].Filter=req.body.ImageFilter2;
			ImageOption[2].Repeate=req.body.ImageRepeate2;
			ImageOption[2].Bin=req.body.ImageBin2;
		}
		if (req.body.ImageCheck3) {
			ImageOption[3] = {};
			ImageOption[3].Exposure=req.body.ImageExposure3;
			ImageOption[3].Filter=req.body.ImageFilter3;
			ImageOption[3].Repeate=req.body.ImageRepeate3;
			ImageOption[3].Bin=req.body.ImageBin3;
		}
		t.ImageOption= ImageOption;
	}
	
	task.save(t)

	console.log('add task');
	console.log(t);
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

exports.actionReorder = function(req, res) {
	task.reOrder(JSON.parse(req.body.id));
	req.session = null;
	res.end();
}

var io;
var socket;

var isExposing = false;
exports.actionStartSequence = function(req, res) {
	res.redirect('/');
	req.session = null;
	res.end();
	task.getTaskList(req.body.id, function(err, list) {
		if (!err) {
			stopSerie = false;
			seqIndex = 0;
			seqText = new Array();
			seqProgress = new Array();
			seqProgressIndex = 0;
			EmitUpdate('connect to MaximDL');
			ccd.Attach(function(err) {
				if (err) {
					CriticalError(err);
					socket.emit('SequenceError', {
						msg: err.message
					});

				} else {
					forEachSeries(list, function(item, callback) {
						ProcessTask(item, callback);
						socket.emit('ProgressSequence', {
							id: item._id
						});
						seqProgress[seqProgressIndex++] = item._id;
					}, function(err) {
						ccd.Dettach();
						socket.emit('SequenceEnd', {});
						if (err) {
							CriticalError(err);
							socket.emit('SequenceError', {
								msg: err.message
							});
						} else {
							EmitUpdate('Sequence completed');
						}
					});
				}
			});
		}
	});
}


function ProcessTask(item,callback){
	switch (item.Action) {
			case  'Ouverture Toit': 	
										EmitUpdate('ouverture toit');
										roof.Open("OuvertureP",callback);
										break;
			case  'Fermeture Toit': 	
										EmitUpdate('fermeture toit');
										roof.Close(callback);
										break;

			case  'Power on monture': 	
										EmitUpdate('monture power on');
										telescope.powerOn(callback);
										break;
			case  'Power off monture': 	
										isExposing = false;
								        EmitUpdate('monture power off');
								        telescope.park(function(err) {
								        	if (!err) telescope.powerOff(callback);
								        	else callback(err);
								        });
										break;

			case  'Slew' : 				
										EmitUpdate('telescope slew: '+item.Target.RA+' '+item.Target.DEC);
										telescope.slew(item.Target.RA,item.Target.DEC,Osenbach,callback);
										break;
			case 'Slew and Expose':     // slew to target
										isExposing = true;
								        EmitUpdate('telescope slew: ' + item.Target.RA + ' ' + item.Target.DEC);
									      telescope.slew(item.Target.RA, item.Target.DEC, Osenbach, function(err) {
									      	if (err) callback(err);
									      	else {
									      		//Expose
									      		EmitUpdate('start expose : ');
									      		forEachSeries(item.ImageOption, function(image, callback2) {
									      			var options = {};
									      			console.log(image);
									      			options.ObjectName = item.Target.Name;
									      			options.index = image.Repeate;
									      			options.Binning = decodeBinning(image.Bin);
									      			options.Filter = decodeFilter(image.Filter);
									      			options.expose = image.Exposure;
									      			EmitUpdate('Expose filter' + image.Filter);
									      			ccd.Expose(options, callback2, socket);
									      		}, function(err) {
									      			callback(err)
									      		});
									      	}
									      	});
									      
									      break;
			default :
										callback('Error ProcessTask :default case');
	}
}

exports.actionStopSequence = function(req, res) {
	res.redirect('/');
	req.session = null;
	res.end();
	stopSerie = true;
	ccd.AbortExposure();

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

function decodeBinning(binning){
	switch (binning){
		case 'Bin 1' : return 1;
		case 'Bin 2' : return 2;
		default :
					console.log('error decoding binning :'+binning+' unknow');

	}
}


function EmitUpdate(text){
	var  now = new Date();
	var  txt = now.getHours()+':'+now.getMinutes()+':'+now.getSeconds()+' :: '+text;
	socket.emit('UpdateSequence',{msg:txt});
	seqText[seqIndex++]= txt;
	console.log(txt);
}

function CriticalError(err) {
	console.log("Critical Error occur :"+err);
	skype.SendMessage('philippelang',"Error occur during sequence")
	skype.SendMessage('philippelang',err.message);
	//skype.VoiceCall('philippelang');
	//child = exec('"C:/Program Files (x86)/Skype/Phone/skype.exe" /callto:"'+'philippelang');
}
//websocket

exports.setIo = function(i){
	io = i;

	io.sockets.on('connection', function (sock) {
		socket=sock;
  		sock.emit('UpdateSequence', {all: seqText, progressAll : seqProgress });
  });
}

//--------- 

var stopSerie = false;

   function forEachSeries(arr, iterator, callback) {
 	if (!arr.length) return callback();
 	var completed = 0;
 	var iterate = function() {
 			iterator(arr[completed], function(err) {
 				if (err) callback(err);
 				else {
 					completed += 1;
 					if (completed === arr.length) {
 						callback(null);
 					} else if (!stopSerie) iterate();
 					else callback(new Error('serie stop by user'));

 				}
 			});
 		};
 	iterate();
 };