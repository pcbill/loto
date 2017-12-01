var express = require('express');
var app = express();
var pg = require('pg');
var basicAuth = require('express-basic-auth');

var dateFormat = require('dateformat');

var personDao = require('./lib/dao/personDao');
var gameDao = require('./lib/dao/gameDao');
var historyDao = require('./lib/dao/historyDao'); 

var shuffle = require('./lib/random').shuffle;
var dateFormat = require('dateformat');

const connectionString = require('./lib/dao/config').connectionString;

app.set('port', (process.env.PORT || 5000));

var basicAuth = basicAuth({
  users: {
      'admin': 'kdorkwj'
  },
  challenge: true
});

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

var bodyParser = require('body-parser');
app.use(bodyParser.json());
//app.use(bodyParser.urlencoded());
// in latest body-parser use like below.
app.use(bodyParser.urlencoded({ extended: true }));

//// Route /////////////////////////////////

app.get('/', (req, res) => {
    gameDao.findAll( (list) => {
      res.render('pages/index', list);
    });
  }
);

//// registration //////////////////////////
app.get('/registration', basicAuth, (req, res) => {
    personDao.findAllRegistered( (list) => {
      list.results.forEach((it)=>{
        it.registration_time = dateFormat(it.registration_time, 'yyyy/mm/dd hh:MM:ss');
      });
      res.render('pages/registration', list);
    });
  }
);

app.post('/registerSubmit', basicAuth, (req, res) => {
  var uid = req.body['uid'];

  if (!uid | uid == '') {
    res.redirect('/registration');
    return;
  }

  personDao.register(uid, () => {
    res.redirect('/registration');
  });
});

//app.post('/registerByNameSubmit', basicAuth, (req, res) => {
//  var name = req.body['name'];
//
//  if (!name | name == '') {
//    res.redirect('/registration');
//    return;
//  }
//
//  personDao.registerByName(uid, (err) => {
//    var msg = 'success';
//    if (err) {
//      msg = 'fail';
//    }
//    res.redirect('/registration', {message: msg});
//  });
//});

app.get('/manageRegistration', basicAuth, (req, res) => {
    personDao.findAllRegistered( (list) => {
      res.render('pages/manageRegistration', list);
    });
  }
);

app.get('/deleteRegistration/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    personDao.deleteOne(id, ()=>{
        res.redirect('/manageRegistration');
    });
});

//// game //////////////////////////////////////
app.get('/gameplay', basicAuth, (req, res) => {
    gameDao.findAll( (list) => {
      res.render('pages/gameplay', list);
    });
});

app.post('/createGame', basicAuth, (req, res) => {
  var gid = req.body['gid'];
  var award_list = req.body['award_list'];
  var participant_count = req.body['participant_count'];
  var type = req.body['type'];

  if (!gid | gid == '') {
    res.redirect('/gameplay');
    return;
  }

  gameDao.saveOne(gid, award_list, participant_count, type, () => {
    res.redirect('/gameplay');
  });
  
});

app.get('/deleteGame/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    gameDao.deleteOne(id, ()=>{
        res.redirect('/gameplay');
    });
});

app.get('/gameComplete', basicAuth, (req, res) => {
    personDao.findAllRegisteredWithoutAward((re) => {
      var list = re.results;
      
      var uids = list.map((it) => { 
        return it.uid 
      });
      
      var gameId = 99999;
      personDao.updateReward(gameId, uids, uids.length, () => { });

      setTimeout(function() {
        res.redirect('/gameplay');
      }, 1000);
    });
});

app.get('/execute/:gameId', basicAuth, (req, res) => {
    var gameId = req.params.gameId;

    gameDao.find(gameId, (it) => {
      var game = it.results[0];

      var gameType = game.exec_type;
      var count = game.participant_count;
      var reminderCount = game.reminder_count;
      personDao.findAllRegisteredWithoutAward((re) => {
        var list = re.results;
        
        var uids = list.map((it) => { 
          return it.uid 
        });
        
        var re = uids;
        for (i = 0; i < 1000; i++) {
          shuffle(re);
        }
 
        if (gameType == 0 && reminderCount >= count) {
          historyDao.saveOne(gameId, re);
          gameDao.played(game, count);
          personDao.updateReward(game.id, re, count, ()=>{});
        } else if (gameType == 1 && reminderCount >= 1) {
          historyDao.saveOne(gameId, re);
          gameDao.played(game, 1);
          personDao.updateReward(game.id, re, 1, ()=>{}); 
        }
      });

      setTimeout(function() {
        res.redirect('/gameplay');
      }, 1000);
    });
});



// check //////////////////////////////////
app.get('/check', (req, res) => {
    res.render('pages/check', {results: []});
});

app.post('/checkSubmit', (req, res) => {
    var uid = req.body['uid'];
  
    if (!uid || uid == '') {
      res.redirect('/check', {results: []});
      return;
    }
  
    personDao.findByUid(uid, (list) => {
      res.render('pages/check', list);
    });
});

app.post('/searchPersonByName', (req, res) => {
    var name = req.body['name'];
  
    if (!name || name == '') {
      res.redirect('/check', {results: []});
      return;
    }
  
    personDao.findByName(name, (list) => {
      res.render('pages/check', list);
    });

});

app.get('/updateGetgiftTime/:uid', basicAuth, (req, res) => {
    var uid = req.params.uid;
  
    if (!uid | uid == '') {
      res.redirect('/check');
      return;
    }
  
    personDao.getGift(uid, () => {
      res.redirect('/check');
    });
});

//app.get('/logout', (req, res) => {
//  res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
//  res.sendStatus(401);
//});
