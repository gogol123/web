var MaximCCD = require("./maximjs").MaximCCD
var fs = require('fs');
var async = require('async');
var sio = require('socket.io');

var maximCCD = new MaximCCD();


var defaultPath = "C:/Users/philippe/tmp";

exports.Attach = function(callback) {
	callback = callback || function() {};
	try {
		maximCCD.Attach();
		callback(null);
	} catch (err) {
		console.log('error during connect to MaximDl');
		callback(new Error('error during connect to MaximDl' + err.message))
	}
}


exports.Dettach = function (){
	maximCCD.Dettach();
}


exports.Expose = function (options,callback,socket){
	if (!options.ImagePath) {
		today = new Date();
		dayPath = defaultPath+"/"+today.getFullYear()+"-"+(today.getMonth()+1)+"-"+today.getDate();
		if (!fs.existsSync(dayPath))
			fs.mkdirSync(dayPath);
		options.ImagePath = dayPath;
	}
	if (options.index)
		nbImage = options.index;
	else
		nbImage=1;
			
function repeater(i,callback) {
	if (i < nbImage) {
		options.ImageIndex = i
		maximCCD.CCDExpose(options,function (err,result) {
			if (err)
				callback(err);
			else {
				 var txt = "Image :"+i+" done :"+result;
				console.log(txt);
				if (socket)
					socket.emit('UpdateSequence',{msg:txt});
				repeater(i+1,callback);
			}
		});
	}
	else {
		console.log('image done');
		callback(null,"Image:"+"done");
	}
}
repeater(0,callback);
}

exports.ExposeRGB = function (options,callback) {

async.series({
    Red: function(call){
		options.Filter = 0;
        exports.Expose(options,call);
    },
    Green: function(call){
		options.Filter = 1;
        exports.Expose(options,call);
    },
	Blue: function(call){
	options.Filter = 2;
    exports.Expose(options,call);
    },
},
function(err, results) {
    if (err)
		callback(err)
	else
		callback(null,"ExposeRGB ok");
});

}
