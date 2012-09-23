var skype = require("./utils/maximjs").SkypeJS;

var _skype = new skype();
//_skype.VoiceCall('philippelang');
_skype.SendSms('+33670893017','essais par nodejs')