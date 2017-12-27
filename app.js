var express = require('express');
var session = require('express-session');
var app = express();
var pg = require('pg');
var basicAuth = require('express-basic-auth');

var personDao = require('./lib/dao/personDao');
var gameDao = require('./lib/dao/gameDao');
var historyDao = require('./lib/dao/historyDao'); 

var shuffle = require('./lib/random').shuffle;

const connectionString = require('./lib/dao/config').connectionString;

app.set('port', (process.env.PORT || 5000));

var basicAuth = basicAuth({
  users: {
      'admin': 'kdorkwj'
  },
  challenge: true
});

app.use(express.static(__dirname + '/public'));
app.use(session({ 
  msg: '',
  big_list: [], 
  reminder_count: 0,
  gid: '',
  secret: 'sec', 
  resave: '', 
  saveUninitialized: '' }));

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

var emptyObj = { msg: '', results: [] };

//// Route /////////////////////////////////

app.get('/', (req, res) => {
    gameDao.findAll( (reObj) => {

      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/index', reObj);
    });
  }
);

//// registration //////////////////////////
app.get('/registration', basicAuth, (req, res) => {
    personDao.findAllRegistered( (reObj) => {
      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/registration', reObj);
    });
  }
);

app.post('/registerSubmit', basicAuth, (req, res) => {
  var uid = req.body['uid'];

  if (!uid | uid == '') {
    req.session['msg'] = '請輸入號碼';
    res.redirect('/registration');
    return;
  }

  personDao.register(uid, (reObj) => {
    req.session['msg'] = reObj.msg;
    res.redirect('/registration');
  });
});

app.post('/registerByNameSubmit', basicAuth, (req, res) => {
  var name = req.body['name'];

  if (!name | name == '') {
    req.session['msg'] = '請輸入完整姓名';
    res.redirect('/registration');
    return;
  }

  personDao.registerByName(name, (reObj) => {
    req.session['msg'] = reObj.msg;
    res.redirect('/registration');
  });
});

app.get('/manageRegistration', basicAuth, (req, res) => {
    personDao.findAllRegistered( (reObj) => {
      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/manageRegistration', reObj);
    });
  }
);

app.get('/deleteRegistration/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    personDao.deleteOne(id, (reObj)=>{
      req.session['msg'] = reObj.msg;
      res.redirect('/manageRegistration');
    });
});

app.post('/createPerson', basicAuth, (req, res) => {
  var uid = req.body['uid'];
  var name = req.body['name'];
  var table_num = req.body['table_num'];

  if (!uid | uid == '') {
    res.redirect('/manageRegistration');
    return;
  }

  personDao.saveOne(uid, name, table_num, () => {
    res.redirect('/manageRegistration');
  });
});

//// game //////////////////////////////////////
app.get('/gameplay', basicAuth, (req, res) => {
  personDao.countRegisteredWithoutAward( (count) => {
    gameDao.findAll( (reObj) => {
      reObj.count = count;
      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/gameplay', reObj);
    });
  });
});

app.post('/createGame', basicAuth, (req, res) => {
  var gid = req.body['gid'];
  var award_list = req.body['award_list'];
  var participant_count = req.body['participant_count'];
  var type = req.body['type'];

  if (!gid | gid == '') {
    req.session['msg'] = '請輸入獎項';
    res.redirect('/gameplay');
    return;
  }

  gameDao.saveOne(gid, award_list, participant_count, type, (reObj) => {
    req.session['msg'] = reObj.msg;
    res.redirect('/gameplay');
  });
  
});

app.get('/deleteGame/:id', basicAuth, (req, res) => {
    var id = req.params.id;
    gameDao.deleteOne(id, (reObj1)=>{
      personDao.cancelRewardByGid(id, (reObj2)=>{
        req.session['msg'] = reObj1.msg;
        res.redirect('/gameplay');
      });
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
        req.session['msg'] = re.msg + ' Game Finished!!';
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
      var candidates ;
      personDao.findAllRegisteredWithoutAward((re) => {
        var list = re.results;
        
        var uids = list.map((it) => { 
          return it.uid 
        });
        
        candidates = uids;
        for (i = 0; i < 1000; i++) {
          shuffle(candidates);
        }
 
        if (gameType == 0 && reminderCount >= count) {
          historyDao.saveOne(gameId, candidates);
          gameDao.played(game, count);
          personDao.updateReward(game.id, candidates, count, ()=>{});
        } else if (gameType == 1 && reminderCount >= 1) {
          historyDao.saveOne(gameId, candidates);
          gameDao.played(game, 1);
          personDao.updateReward(game.id, candidates, 1, ()=>{}); 
        }
      });

      setTimeout(function() {
        req.session['msg'] = it.msg + 'Game Executed!!';
        if (gameType == 0 && reminderCount >= count) {
          res.redirect('/listWinner/'+gameId);
        } else if (gameType == 1 && reminderCount >= 1) {
          req.session['big_list'] = candidates;
          req.session['reminder_count'] = reminderCount;
          req.session['gid'] = game.id;
          res.redirect('/playBig');
        }
      }, 1000);
    });
});

app.get('/editWinner/:gid', basicAuth, (req, res) => {
    var gid = req.params.gid;

    gameDao.find(gid, (reGame) => {
      var games = reGame.results;

      personDao.findByGid(gid, (rePerson) => {
        rePerson.gid = games[0].gid;
        res.render('pages/editWinner', rePerson);
      });
    });
});

app.get('/listWinner/:gid', (req, res) => {
    var gid = req.params.gid;

    gameDao.find(gid, (reGame) => {
      var games = reGame.results;

      personDao.findByGid(gid, (rePerson) => {
        rePerson.gid = games[0].gid;
        res.render('pages/listWinner', rePerson);
      });
    });
});

app.get('/cancelWinner/:gid/:uid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var uid = req.params.uid;

    personDao.cancelReward(uid, (re) => {
        gameDao.cancelOneReward(gid);

        req.session['msg'] = re.msg + ' winner cancel!!';
        res.redirect('/listWinner/'+gid);
    });
});

app.get('/playBig', basicAuth, (req, res) => {
    var list = req.session['big_list'];
    req.session['big_list'] = [];
    var reminderCount = req.session['reminder_count'];
    req.session['reminder_count'] = 0;
    var gid = req.session['gid'];
    req.session['gid'] = 0;

    res.render('pages/startPlayBig', {
      results: list,
      gid: gid, 
      reminderCount: reminderCount});
});


app.get('/playNormal/:gid', basicAuth, (req, res) => {
  var gid = req.params.gid;

  gameDao.find(gid, (reGame) => {
    var game = reGame.results[0];
    res.render('pages/startPlayNormal', {
      reminderCount: game.reminder_count, 
      gid: game.id
    });
  });
});

// check //////////////////////////////////
app.get('/check', (req, res) => {
    emptyObj.msg = req.session['msg'];
    req.session['msg'] = '';
    res.render('pages/check', emptyObj);
});

app.post('/checkSubmit', (req, res) => {
    var uid = req.body['uid'];
  
    if (!uid || uid == '') {
      req.session['msg'] = '請輸入號碼';
      res.redirect('/check');
      return;
    }
  
    personDao.findByUid(uid, (reObj) => {
      var person = reObj.results[0];
      if (person) {
        var gameid = person.award_game_id;
        if (gameid) {
          gameDao.find(gameid, (reGame) => {

console.log(reGame);
            person.awardList = reGame.results[0].award_list;
          });
        } else {
            person.awardList = "";
        }
        reObj.results[0] = person;
console.log('------'+reObj);
      } else {
      }

console.log(reObj.results);
      
      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/check', reObj);
    });
});

app.post('/searchPersonByName', (req, res) => {
    var name = req.body['name'];
  
    if (!name || name == '') {
      req.session['msg'] = '請輸入姓名';
      res.redirect('/check');
      return;
    }
  
    personDao.findByName(name, (reObj) => {
      reObj.msg = req.session['msg'];
      req.session['msg'] = '';
      res.render('pages/check', reObj);
    });

});

app.get('/updateGetgiftTime/:uid', basicAuth, (req, res) => {
    var uid = req.params.uid;
  
    if (!uid | uid == '') {
      req.session['msg'] = '請輸入姓名';
      res.redirect('/check');
      return;
    }
  
    personDao.getGift(uid, (reObj) => {
      req.session['msg'] = reObj.msg + ' ' + uid +' got gift !!';
      res.redirect('/check');
    });
});

//app.get('/logout', (req, res) => {
//  res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
//  res.sendStatus(401);
//});
