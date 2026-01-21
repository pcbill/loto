'use strict';

// 讀取本地環境變數檔案 (.env.local)
var path = require('path');
var fs = require('fs');
var envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log('Loaded environment from .env.local');
}

var express = require('express');
var session = require('express-session');
var app = express();
var pg = require('pg');

var personDao = require('./lib/dao/personDao');
var registrationHistoryDao = require('./lib/dao/registrationHistoryDao');
var gameDao = require('./lib/dao/gameDao');
var historyDao = require('./lib/dao/historyDao'); 

var shuffle = require('./lib/random').shuffle;

const connectionString = require('./lib/dao/config').connectionString;

app.set('port', (process.env.PORT || 5000));

// 從環境變數讀取認證資訊
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

function basicAuth(req, res, next) {

    var authHeader = req.headers.authorization;
    if (!authHeader) {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        next(err);
        return;
    }
    var auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    var user = auth[0];
    var pass = auth[1];
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        next(); // authorized
    } else {
        var err = new Error('You are not authenticated!');
        res.setHeader('WWW-Authenticate', 'Basic');
        err.status = 401;
        next(err);
    }
}

app.use(express.static(__dirname + '/public'));

// Session 設定 - 使用環境變數設定 secret
const SESSION_SECRET = process.env.SESSION_SECRET || 'loto-dev-secret-change-in-production';

app.use(session({ 
  secret: SESSION_SECRET, 
  resave: false, 
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // 生產環境啟用 HTTPS only
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // 24 小時
  }
}));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
    console.log('Open http://localhost:' + app.get('port') + ' in your browser');
});

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 請求追蹤 middleware - 記錄每個請求
app.use((req, res, next) => {
    var startTime = Date.now();
    console.log('[REQ] ' + new Date().toISOString() + ' ' + req.method + ' ' + req.url);
    
    // 當回應結束時記錄
    res.on('finish', () => {
        var duration = Date.now() - startTime;
        console.log('[RES] ' + new Date().toISOString() + ' ' + req.method + ' ' + req.url + ' ' + res.statusCode + ' (' + duration + 'ms)');
    });
    
    next();
});

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

  if (!uid || uid === '') {
    req.session['msg'] = '請輸入號碼';
    res.redirect('/registration');
    return;
  }

  var name = '';
  registrationHistoryDao.saveOne(uid, name, (reObj) => {
      personDao.register(uid, (reObj) => {
          req.session['msg'] = reObj.msg;
          res.redirect('/registration');
      });
  });
});

app.post('/registerByNameSubmit', basicAuth, (req, res) => {
  var name = req.body['name'];

  if (!name || name === '') {
    req.session['msg'] = '請輸入完整姓名';
    res.redirect('/registration');
    return;
  }

  var uid = '';
  registrationHistoryDao.saveOne(uid, name, (reObj) => {
      personDao.registerByName(name, (reObj) => {
        req.session['msg'] = reObj.msg;
        res.redirect('/registration');
      });
  });
});

app.get('/manageRegistration', basicAuth, (req, res) => {
    personDao.findAllRegistered( (reObj) => {
      reObj.msg = req.session['msg'];
      console.log(reObj.msg);
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

  if (!uid || uid === '') {
    res.redirect('/manageRegistration');
    return;
  }
  
  personDao.findByUid(uid, (rePerson) => {
    if (rePerson.results.length <= 0) {
      personDao.saveOne(uid, name, table_num, () => {
        res.redirect('/manageRegistration');
      });
    } else {
        req.session['msg'] = 'id 重複';
        res.redirect('/manageRegistration');
    }
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

  if (!gid || gid === '') {
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
        return it.uid;
      });
      
      var gameId = 99999;
      personDao.allPlayed(gameId, uids, uids.length, () => { });

      setTimeout(function() {
        req.session['msg'] = re.msg + ' Game Finished!!';
        res.redirect('/gameplay');
      }, 1000);
    });
});

app.get('/normalGameReplay', basicAuth, (req, res) => {
    var index = 0;
    var candidateUids = null;

    // type 0 = normal game
    gameDao.findByExecType(0, (reGame) => {
        const uids = [];
        // const gameIds = new Set;
        const gToUmap = new Map();
        // console.log({reGame})
        reGame.results.forEach((game) => {
            personDao.findNotGetByGid(game.id, (rePerson) => {
                var refillCount = 0;
                rePerson.results.forEach((person) => {
                    // gameIds.add(person.award_game_id);
                    uids.push(person.uid);

                    gToUmap.get(person.award_game_id) ?
                        gToUmap.get(person.award_game_id).push(person.uid) :
                        gToUmap.set(person.award_game_id, [person.uid]);

                    gameDao.cancelOneReward(game.id, () => {
                        refillCount++;
                        if (refillCount === rePerson.results.length) {
                            console.log({'arrive refill Count': rePerson.results.length});
                        }
                    }); // 數量要還回去
                });
            });
        });
        setTimeout(() => {
            // console.log({uids, gToUmap});
            var msg = '';
            personDao.updateNormalGameWinnerFromNullGetGiftimeToVoucher(uids, () => {
                // replay
                [...gToUmap.keys()].forEach((gameId) => {
                    var games = [];
                    gameDao.find(gameId, (it) => {
                        games = it.results;

                        const validGameBundles = [];
                        for (let i = 0; i < games.length; i++) {
                            const game = games[i];
                            const count = gToUmap.get(gameId).length;
                            const reminderCount = game.reminder_count;
                            if (reminderCount >= count) {
                                console.log({game, count, reminderCount});
                                validGameBundles.push({game, count, reminderCount});
                            }
                        };


                        personDao.findAllRegisteredWithoutAward((re) => {
                            const people = re.results;

                            const uidAndNames = people.map((it) => {
                                return [it.uid, it.name];
                            });

                            if (candidateUids === null) {
                                const shuffle_times = 500;
                                for (let i = 0; i < shuffle_times; i++) {
                                    shuffle(uidAndNames);
                                }

                                candidateUids = uidAndNames.map((it) => {
                                    return it[0];
                                });
                            }
                            console.log({candidateUids});

                            // var index = 0;
                            while (validGameBundles.length > 0) {
                                const bundle = validGameBundles.pop();
                                const game = bundle.game;
                                console.log({game, index});
                                console.log({before:game.id, candidateUidsLength:candidateUids.length});
                                const canUids = candidateUids.splice(index, bundle.count);
                                console.log({after:game.id, canUids, candidateUidsLength:candidateUids.length});

                                gameDao.played(game, bundle.count);
                                personDao.allRePlayed(game, canUids, bundle.count, (re) => {
                                });
                                historyDao.saveOne(game.id, canUids);
                                index = index + bundle.count + 1;
                            }
                        });

                        // 使用非阻塞式等待，避免凍結事件迴圈
                        const sec = (count / 10) + 1;
                        console.log("for loop, waiting secs: " + sec);
                        // 移除 while 阻塞迴圈，改用 setTimeout 已在外層處理
                    });
                });
            });
            res.redirect('/listReplayWinner/');
        }, 5000);
    });
})

app.get('/execute/:gameId/:playRightNow', basicAuth, (req, res) => {
    var gameId = req.params.gameId;
    var playRightNow = req.params.playRightNow;

    gameDao.find(gameId, (it) => {
      var game = it.results[0];

      var gameType = game.exec_type;
      var count = game.participant_count;
      var reminderCount = game.reminder_count;

      var candidates ;
      personDao.findAllRegisteredWithoutAward((re) => {
        var list = re.results;
        
        var upairs = list.map((it) => { 
          return [it.uid, it.name];
        });
        console.log("upairs length: " + upairs.length);

        var shuffle_times = 500;
        console.log("shuffle_times: " + shuffle_times);
        for (let i = 0; i < shuffle_times; i++) {
          shuffle(upairs);
        }
        
        candidates = upairs.map((it) => {
          return it[0];
        });
 
        req.session['msg'] = it.msg + 'Game Executed!!';

        req.session['gameName'] = game.award_list;
        if (gameType == 0 && reminderCount >= count)
        {
          // normal
          historyDao.saveOne(gameId, candidates);
          gameDao.played(game, count);
          personDao.allPlayed(game.id, candidates, count, ()=>{});

            var sec = (count / 10);
            console.log("waiting secs: " + sec);
            setTimeout(function() {
              res.redirect('/listWinnerDramaly/'+gameId);
            }, (sec * 1000));
        }
        else if (gameType == 1 && reminderCount >= 1) 
        {
          // big game

          personDao.findByGid(game.id, (rePerson) => {
            if (playRightNow === 'true') {
                historyDao.saveOne(gameId, candidates);
                gameDao.played(game, 1);
                // personDao.allPlayed(game.id, candidates, 1, ()=>{});
            }

            var listForUI = upairs.map((it) => {
              return it[0] + " " + it[1];
              // return it[1]; //only name
            });
            req.session['big_list'] = listForUI;
            req.session['reminder_count'] = reminderCount;
            req.session['gid'] = game.id;
            req.session['playRightNow'] = playRightNow;

            req.session['winners'] = rePerson.results;
            res.redirect('/playBig');
          });
        }


      });
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
        //rePerson.gid = games[0].gid;
        for (var i = 0; i < rePerson.results.length; i++) {
          rePerson.results[i].awardList = games[0].award_list;
        }
        res.render('pages/listWinner', rePerson);
      });
    });
});

app.get('/listReplayWinner', (req, res) => {

    personDao.findByReplay((rePerson) => {
        res.render('pages/listReplayWinner', rePerson);
    });
});

app.get('/listWinnerDramaly/:gid', (req, res) => {
    var gid = req.params.gid;

    gameDao.find(gid, (reGame) => {
        var games = reGame.results;

        personDao.findByGid(gid, (rePerson) => {
        //rePerson.gid = games[0].gid;
            for (var i = 0; i < rePerson.results.length; i++) {
                rePerson.results[i].awardList = games[0].award_list;
            }

            console.log({length:rePerson.results.length});
            res.render('pages/listWinnerDramaly', rePerson);

        });
    });
});


app.get('/cancelWinner/:gid/:uid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var uid = req.params.uid;

    personDao.cancelReward(uid, (re) => {
        gameDao.cancelOneReward(gid);

        req.session['msg'] = re.msg + ' winner cancel!!';
        res.redirect('/editWinner/'+gid);
   });
});

app.get('/cancelWinnerQuietly/:gid/:uid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var uid = req.params.uid;

    personDao.cancelReward(uid, (re) => { });
    gameDao.cancelOneReward(gid);

    res.sendStatus(200);
});

app.get('/updatePlayerGameRelation/:gid/:uid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var uid = req.params.uid;

    personDao.allPlayed(gid, [uid], 1, ()=>{});

    res.sendStatus(200);
});

app.get('/playBig', basicAuth, (req, res) => {
    var list = req.session['big_list'];
    req.session['big_list'] = [];
    
    var reminderCount = req.session['reminder_count'];
    req.session['reminder_count'] = 0;

    var gid = req.session['gid'];
    req.session['gid'] = 0;

    var winners = req.session['winners'];
    req.session['winners'] = [];

    var gameName = req.session['gameName'];
    req.session['gameName'] = '';

    var playRightNow = req.session['playRightNow'];
    req.session['playRightNow'] = false;

    res.render('pages/startPlayBig', {
      results: list,
      gid: gid, 
      winners: winners,
      gameName: gameName,
      playRightNow: playRightNow,
      reminderCount: reminderCount});
});


app.get('/playNormal/:gid', basicAuth, (req, res) => {
  var gid = req.params.gid;

  gameDao.find(gid, (reGame) => {
    var game = reGame.results[0];
    res.render('pages/startPlayNormal', {
      reminderCount: game.reminder_count, 
      gid: game.id,
      gameName: game.award_list
    });
  });
});

app.get('/beforePlayBig/:gid', basicAuth, (req, res) => {		
  var gid = req.params.gid;		
		
  gameDao.find(gid, (reGame) => {		
    var game = reGame.results[0];		
    res.render('pages/beforePlayBig', {		
      reminderCount: game.reminder_count, 		
      gid: game.id		
    });		
  });		
});

// check //////////////////////////////////
function showSearch(req, res, targetPage) {
    emptyObj.msg = req.session['msg'];
    req.session['msg'] = '';
    res.render(targetPage, emptyObj);
}

app.get('/searchForMana', basicAuth, (req, res) => {
  showSearch(req, res, 'pages/searchForMana');
});

app.get('/check', (req, res) => {
  showSearch(req, res, 'pages/check');
});


app.post('/checkSubmit', (req, res) => {
  searchSubmit(req, res, '/check');
});

app.post('/searchSubmitForMana', basicAuth, (req, res) => {
  searchSubmit(req, res, '/searchForMana');
});

function searchSubmit(req, res, target) {
  var uid = req.body['uid'];
  
    if (!uid || uid == '') {
      req.session['msg'] = '請輸入號碼';
      res.redirect(target);
      return;
    }
  
    personDao.findByUid(uid, (reObj) => {
      var person = reObj.results[0];
      if (person) {
        var gameid = person.award_game_id;
        if (gameid) {
          gameDao.find(gameid, (reGame) => {
            if (reGame.results.length > 0) {
              person.awardList = reGame.results[0].award_list;
            } else {
              person.awardList = "員生消費合作社500元兌換券";
            }
          });
        } else {
            person.awardList = "";
        }
        reObj.results[0] = person;
      } else {
      }

      setTimeout(function() {
        reObj.msg = req.session['msg'];
        req.session['msg'] = '';
        res.render('pages' + target, reObj);
      }, 1000);
    });
  }

app.post('/searchPersonByName', (req, res) => {
  searchPersonByNameForMana(req, res, '/check');
});
app.post('/searchPersonByNameForMana', basicAuth, (req, res) => {
  searchPersonByNameForMana(req, res, '/searchForMana');
});
function searchPersonByNameForMana (req, res, target) {
    var name = req.body['name'];
  
    if (!name || name == '') {
      req.session['msg'] = '請輸入姓名';
      res.redirect(target);
      return;
    }
  
    personDao.findByName(name, (reObj) => {
      var person = reObj.results[0];
      if (person) {
        var gameid = person.award_game_id;
        if (gameid) {
          gameDao.find(gameid, (reGame) => {
            if (reGame.results.length > 0) {
              person.awardList = reGame.results[0].award_list;
            } else {
              person.awardList = "員生消費合作社500元兌換券";
            }
          });
        } else {
            person.awardList = "";
        }
        reObj.results[0] = person;
      } else {
      }

      setTimeout(function() {
        reObj.msg = req.session['msg'];
        req.session['msg'] = '';
        res.render('pages' + target, reObj);
      }, 1000);
    });
}

app.get('/updateGetgiftTime/:uid', basicAuth, (req, res) => {
    var uid = req.params.uid;
  
    if (!uid || uid === '') {
      req.session['msg'] = '請輸入姓名';
      res.redirect('/searchForMana');
      return;
    }
  
    personDao.getGift(uid, (reObj) => {
      req.session['msg'] = reObj.msg + ' ' + uid +' got gift !!';
      res.redirect('/searchForMana');
    });
});

// 404 處理
app.use((req, res, next) => {
    res.status(404).send('頁面不存在');
});

// 全域錯誤處理 middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    
    // 認證錯誤
    if (err.status === 401) {
        res.status(401).send('未授權的存取');
        return;
    }
    
    // 一般錯誤
    res.status(err.status || 500).send('伺服器發生錯誤，請稍後再試');
});

// 處理未捕獲的 Promise 錯誤
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// 處理未捕獲的例外
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // 給予時間記錄錯誤後安全關閉
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});
