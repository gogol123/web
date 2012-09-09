var net = require('net');
var util =require('./util.js');
var Location = require("./maximjs").Location;

var ntm;
var ParkPosition ={
	ha  : 0.0,
	dec : -41.0,
}

var CmdCompletePattern= new RegExp("10 COMMAND COMPLETE","m");
var CmdSetCompletePattern= new RegExp("100 COMMAND COMPLETE","m");
var CmdPowerOnPattern= new RegExp("200 COMMAND COMPLETE","m");
var CmdParkPattern= new RegExp("300 COMMAND COMPLETE","m");
var CmdSlewPattern= new RegExp("400 COMMAND COMPLETE","m");


var HAPattern = new RegExp					("10 DATA INLINE HA.CURRPOS=(-?[0-9]*.[0-9]*)","m");
var DECPattern = new RegExp					("10 DATA INLINE DEC.CURRPOS=(-?[0-9]*.[0-9]*)","m");
var PowerStatePattern = new RegExp			("10 DATA INLINE CABINET.POWER_STATE=(-?[0-9]*.[0-9]*)","m");
var ReferendedPattern = new RegExp			("10 DATA INLINE CABINET.REFERENCED=([0-9]*.[0-9]*)","m");
var GlobalStatusPattern = new RegExp		("10 DATA INLINE CABINET.STATUS.GLOBAL=([0-9]*.[0-9]*)","m");
var TrackPattern = new RegExp				("10 DATA INLINE POINTING.TRACK=([0-9]*.[0-9]*)","m");
var HAMotionPattern = new RegExp			("10 DATA INLINE HA.MOTION_STATE=([0-9]*)","m");
var DECMotionPattern = new RegExp			("10 DATA INLINE DEC.MOTION_STATE=([0-9]*)","m");
var PointingTargetRAPattern = new RegExp	("10 DATA INLINE POINTING.TARGET.RA=(-?[0-9]*.[0-9]*)","m");
var PointingTargetDecPattern = new RegExp	("10 DATA INLINE POINTING.TARGET.DEC=(-?[0-9]*.[0-9]*)","m");

var ntmAnwser = "";
var StatusCallback;
var setCallback =null;
 

function powerOnCallback() {
	function isReferenced(err,result) {
		if(err)
			setCallback(err);
		else
			if (result.Referenced == 1.0) {
				clearInterval(isRefId);
				setCallback(null);
			}	
	}
	isRefId = setInterval(exports.getNTMStatus,2000,isReferenced);
}

var TelescopStatus = {
	Power : 0,
	Referenced : 0.0,
	Globalstatus : 0,
	CurrHA : 0.0,
	CurrDec: 0.0,
	Track : 0,
	HAMotionstate : 0,
	DecMotionstate : 0,
	PointingTargetRA : 0.0,
	PointingTargetDec : 0,

};
	
exports.powerOn = function(callback){
	ntmAnwser = "";
	ntm.write("200 SET CABINET.POWER=1\n");
	setCallback= callback;
}

exports.powerOff = function(callback){
	ntmAnwser = "";
	ntm.write("100 SET CABINET.POWER=0\n");
	setCallback= callback;

}

function parkCallback() {
	function isPark(err,result) {
		console.log("IsPark");
		console.log(result);
		if(err && !setCallback)
			setCallback(err);
		else
			if   ((result.CurrHA > (ParkPosition.ha -1.0)) && (result.CurrHA < (ParkPosition.ha +1.0) ) &&
				(result.CurrDec > (ParkPosition.dec -1.0))&&(result.CurrDec < (ParkPosition.dec +1.0))) {
				clearInterval(isParkId);
				//if (!setCallback) {
					setCallback(null);
				//	}
					
				}
	}
	isParkId = setInterval(exports.getNTMStatus,1000,isPark);
}

 

exports.park = function(callback){
	ntmAnwser = "";
	ntm.write("300 SET HA.TARGETPOS=0.0;DEC.TARGETPOS=-41.0\n");
	setCallback= callback;
}



function isTrack(err,result) {	
		setCallback(null);
	}
	


exports.slew = function(ra,dec,location,callback) {

	//decode ra and dec
	
	var R = ra.decodeRa();
	var D = dec.decodeDec();
	
	var hz = location.EqtoHz(util.hms_to_deg(R),util.dms_to_deg(D));

	if (hz.alt < 5.0) 
		callback (new Error("Error occur in slewing telescope : object is below (deg!"));
	r=util.hms_to_hdec(R);
	d=util.dms_to_deg(D)
	console.log("Slewing to :"+r+" : "+d);
	ntmAnwser = "";
/*
	ntm.write("400 SET POINTING.TARGET.RA="+r.toString()+"\n");
	ntm.write("400 SET POINTING.TARGET.DEC="+d.toString()+"\n");
	ntm.write("400 SET POINTING.TARGET.RA_V=0.0\n");
	ntm.write("400 SET POINTING.TARGET.DEC_V=0.0\n");
	ntm.write("400 SET POINTING.TRACK=386\n");
*/
	setTimeout(exports.getNTMStatus,20000,isTrack);
	setCallback= callback;
}

exports.startTrack= function(){
	ntmAnwser = "";
	ntm.write("100 SET POINTING.TRACK=386\n");
}

exports.stopTrack= function()
{
	ntmAnwser = "";
	ntm.write("100 SET POINTING.TRACK=0\n");
}
exports.clearError = function(){
	ntmAnwser = "";
	ntm.write("100 SET CABINET.STATUS.CLEAR=1\n");

}



exports.getNTMStatus = function (callback) {
	ntmAnwser = "";
	StatusCallback=callback;
	ntm.write('10 GET CABINET.POWER_STATE;CABINET.REFERENCED;CABINET.STATUS.GLOBAL;POINTING.TRACK;');
	ntm.write('HA.CURRPOS;HA.MOTION_STATE;DEC.CURRPOS;DEC.TARGETPOS;DEC.MOTION_STATE;POINTING.TARGET.RA;POINTING.TARGET.DEC\n');
	

}

exports.NTMConnect = function () {

 ntm = net.connect(65432,'192.168.200.195', function(){
   ntm.on('data', function(data) {
   ntmAnwser+=data.toString();
	if (data.toString().search(CmdCompletePattern) !=-1){
	//	console.log(ntmAnwser);
	 TelescopStatus.CurrHA   = parseFloat(ntmAnwser.match(HAPattern)[1]);
	 TelescopStatus.CurrDec  = parseFloat(ntmAnwser.match(DECPattern)[1]);
	 power = ntmAnwser.match(PowerStatePattern)[1];
	 if (power)
		TelescopStatus.Power= parseFloat(ntmAnwser.match(PowerStatePattern)[1]);
	 TelescopStatus.Referenced= parseFloat(ntmAnwser.match(ReferendedPattern)[1]);
	 TelescopStatus.Globalstatus= parseFloat(ntmAnwser.match(GlobalStatusPattern)[1]);
	 TelescopStatus.Track= parseInt(ntmAnwser.match(TrackPattern)[1]);
	 TelescopStatus.HAMotionstate= parseInt(ntmAnwser.match(HAMotionPattern)[1]);
	 TelescopStatus.DecMotionstate= parseInt(ntmAnwser.match(DECMotionPattern)[1]);
	 TelescopStatus.PointingTargetRA= parseFloat(ntmAnwser.match(PointingTargetRAPattern)[1]);
	 TelescopStatus.PointingTargetDec= parseFloat(ntmAnwser.match(PointingTargetDecPattern)[1]);
	 if (StatusCallback)
		StatusCallback(null,TelescopStatus);
	 ntmAnwser = "";
	 }
	 if (data.toString().search(CmdSetCompletePattern) !=-1) 
		if (setCallback)
			setCallback(null);
	 if (data.toString().search(CmdPowerOnPattern) !=-1) 
		powerOnCallback();
	if (data.toString().search(CmdParkPattern) !=-1) 
		parkCallback();
	
		
		
   });

   ntm.on('error', function(err) {
     console.log('error:', err.message);
	 
   });

  ntm.write('01 SET SERVER.CONNECTION.EVENTMASK=0\n');
});
}
exports.NTMDisconnect = function() {
	ntm.end('DISCONNECT');
}


