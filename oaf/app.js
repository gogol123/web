
/**
 * Module dependencies.
 */

process.on('uncaughtException', function(err) {
  console.log('Major Error uncaughtException');
  console.log(new Date()+err.stack);
});


var express = require('express')
  , passport = require('passport')
  , flash = require('connect-flash')
  , routes = require('./routes')
  , https = require('https')
  , path = require('path')
  , sio = require('socket.io')
  , fs =   require('fs')
  , mongo = require('mongodb')
  , LocalStrategy = require('passport-local').Strategy;

var app = express();

var Server = mongo.Server;
var Db = mongo.Db;

var server = new Server('localhost', 27017, {auto_reconnect: true});
var db = new Db('oaf', server);

var options = {
    key: fs.readFileSync('../server-key.pem'),
    cert: fs.readFileSync('../server-cert.pem')
}
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  //app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.favicon(__dirname + '/public/images/favicon.png'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.session());
  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
});

app.configure('development', function(){
 app.use(express.errorHandler());
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');

  });


app.get('/', routes.index);
app.get('/login',routes.login);
app.get('/logout',routes.logout);
app.get('/toit',ensureAuthenticated,routes.toit);
app.get('/mount',ensureAuthenticated,routes.mount);
app.get('/meteo',ensureAuthenticated,routes.meteo);
app.get('/task',ensureAuthenticated,routes.task);

app.get('/json/roof',ensureAuthenticated,routes.jsonRoof);
app.get('/json/mount',ensureAuthenticated,routes.jsonMount);
app.get('/json/meteo',ensureAuthenticated,routes.jsonMeteo);
app.get('/json/actionlist',ensureAuthenticated,routes.jsonActionList);
app.get('/json/sequencelist',ensureAuthenticated,routes.jsonSeqList);
app.get('/json/sequence',ensureAuthenticated,routes.jsonSeq);
app.get('/json/task',ensureAuthenticated,routes.jsonTask);


  
app.post('/action/mount',ensureAuthenticated,routes.actionMount)
app.post('/action/roof',ensureAuthenticated,routes.actionRoof)
app.post('/action/meteo',ensureAuthenticated,routes.actionMeteo)
app.post('/action/addtask',ensureAuthenticated,routes.actionAddTask)
app.post('/action/searchObject',ensureAuthenticated,routes.actionsearchObject)
app.post('/action/deleteTask',ensureAuthenticated,routes.actiondeleteTask)
app.post('/action/addSeq',ensureAuthenticated,routes.actionAddSeq)
app.post('/action/reorder',ensureAuthenticated,routes.actionReorder)

app.post('/action/startSequence',ensureAuthenticated,routes.actionStartSequence)

server =https.createServer(options,app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});



function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}




function findById(id, fn) {
  if (!db) {
    db.open(function(err, db) {
    if(!err) 
     console.log("Connected to mongodb:oaf");
    });
  }
  db.collection('users', function(err, collection) { 
    collection.find({'id':id}).toArray(function(err, items) {
      if (err)
          fn(new Error('User ' + id + ' does not exist'));
      else
        fn(null,items[0]);
    })
  })
}
  
  

function findByUsername(username, fn) {
    if (!db) {
    db.open(function(err, db) {
    if(!err) 
     console.log("Connected to mongodb:oaf");
    });
  }
  db.collection('users', function(err, collection) { 
    collection.find({'username':username}).toArray(function(err, items) {
      if (err)
          fn(null,null);
      else
        fn(null,items[0]);
    })
  })
}


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(
  function(username, password, done) {
      // Find the user by username. If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message. Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
  }
));


var io = sio.listen(server,options);
io.set('log level', 0);
routes.setIo(io);