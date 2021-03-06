
var tel = require('./tpl2.js');
var async = require('async');
var utils = require('util');
var roof = require('./roof.js');
	
String.prototype.decodeRa=function(){ 
//decode ra and dec
	
	var pattern = new RegExp("([\+\-]?[0-9]*)[h \s]([0-9]*[\.]?[0-9]*)[\s m ]?([0-9]*)s?");
	var result = this.match(pattern);
	
	
	if (!result )
		throw new Error("Invalid format");
		
	target = {
		ra : {
			h : result[1],
			mn : result[2],
			s : result[3],
			}
		}
	return target;
}

String.prototype.decodeDec=function(){ 
//decode ra and dec
	
	var pattern = new RegExp("([\+\-]?[0-9]*)[\s d]([0-9]*[\.]?[0-9]*)[\s m]?([0-9]*)s?");
	var result =this.match(pattern);
	
	if (!result )
		throw new Error("Invalid format");
	
	target = {
		dec : {
			d : result[1],
			mn : result[2],
			s : result[3],
			}
		}
	return target;
}


exports.hms_to_deg = function( heq ) {
	var  angle;
	angle = (heq.ra.h / 24) * 360;
    angle += (heq.ra.mn / 60) * 15;
	angle +=(heq.ra.s / 60)*.25;
	return angle ;
}
	
exports.dms_to_deg = function( heq ) {
	var  angle=0.0;
	angle = Math.abs( heq.dec.d );
    angle += Math.abs(heq.dec.mn / 60);
	angle +=Math.abs(heq.dec.s / 3600);
	
	if (heq.dec.d  < 0)
		angle = angle*-1.0;

	return angle ;
}

exports.hms_to_hdec = function( heq ) {
	var  angle=0.0;
	angle = Math.abs(heq.ra.h) ;
    angle = angle +(heq.ra.mn / 60.);
	angle = angle+(heq.ra.s / 3600.);

	return angle ;
}

exports.wait = function(time,callback){
	setTimeout(function(){callback(null)}, time);
}
exports.SlewExpose = function (options,tele,ccd,location,callback){
	async.series({
		Slew: function(call){
				tele.slew(options.Object.ra,options.Object.dec,location,call)
		},
		ExposeL: function(call){
			if (!options.Repeate)
				options.index=1;
			else {
				if (utils.isArray(options.Repeate))
					options.index = options.Repeate[0];
				else
					options.index = options.Repeate;
			}
			if (utils.isArray(options.ExposureTime))
				options.expose = options.ExposureTime[0];
			else
				options.expose = options.ExposureTime;			
			options.Filter = 3;
			ccd.Expose(options,call);
		},
		RGB: function(call){
			if (!options.Repeate)
				options.index=1;
			else {
				if (utils.isArray(options.Repeate))
					options.index = options.Repeate[1];
				else
					options.index = options.Repeate;
			}
			if (utils.isArray(options.ExposureTime))
				options.expose = options.ExposureTime[1];
			else
				options.expose = options.ExposureTime;		
			ccd.ExposeRGB(options,call);
		},
		Park: function(call){
			tele.park(call);
		},
},
function(err, results) {
    if (err)
		callback(err)
	else {
		callback(null,results);
	}
	
});
	
}







