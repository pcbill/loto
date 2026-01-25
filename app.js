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

// Excel 上傳處理
var multer = require('multer');
var XLSX = require('xlsx');
var upload = multer({ storage: multer.memoryStorage() });

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

// 信任反向代理（Render, Heroku 等 PaaS 平台需要）
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(session({ 
  secret: SESSION_SECRET, 
  resave: true,  // 改為 true，確保 session 被保存
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // 生產環境啟用 HTTPS only
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,  // 24 小時
    sameSite: 'lax'  // 允許同站點 redirect 攜帶 cookie
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

//// upload data ///////////////////////////
app.get('/uploadData', basicAuth, (req, res) => {
    res.render('pages/uploadData', { msg: req.session['msg'] || '' });
    req.session['msg'] = '';
});

// 上傳獎項資料 API
// Excel 欄位: gid, award_list, participant_count, reminder_count, exec_type
app.post('/api/upload/games', basicAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '請選擇檔案' });
        }
        
        // 讀取 Excel 檔案
        var workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        var sheetName = workbook.SheetNames[0];
        var worksheet = workbook.Sheets[sheetName];
        var data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            return res.status(400).json({ success: false, message: 'Excel 檔案沒有資料' });
        }
        
        // 驗證必要欄位
        var requiredFields = ['gid', 'award_list', 'participant_count', 'exec_type'];
        var firstRow = data[0];
        var missingFields = requiredFields.filter(f => !(f in firstRow));
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少必要欄位: ' + missingFields.join(', ') 
            });
        }
        
        // 使用 pg 直接執行批次操作
        var client = await pg.connect();
        try {
            await client.query('BEGIN');
            
            // 清空現有獎項資料
            await client.query('DELETE FROM game');
            
            // 批次插入新資料
            var insertCount = 0;
            for (var row of data) {
                var gid = String(row.gid || '').trim();
                var award_list = String(row.award_list || '').trim();
                var participant_count = parseInt(row.participant_count) || 0;
                var reminder_count = parseInt(row.reminder_count) || participant_count;
                var exec_type = parseInt(row.exec_type) || 0;
                
                if (gid && award_list) {
                    await client.query(
                        'INSERT INTO game(gid, award_list, participant_count, reminder_count, exec_type) VALUES($1, $2, $3, $4, $5)',
                        [gid, award_list, participant_count, reminder_count, exec_type]
                    );
                    insertCount++;
                }
            }
            
            await client.query('COMMIT');
            
            console.log('上傳獎項資料成功，共 ' + insertCount + ' 筆');
            res.json({ 
                success: true, 
                message: '獎項資料上傳成功',
                count: insertCount
            });
            
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('上傳獎項資料失敗:', err);
        res.status(500).json({ success: false, message: '處理檔案失敗: ' + err.message });
    }
});

// 上傳人員資料 API
// Excel 欄位: uid, name, table_num
app.post('/api/upload/persons', basicAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '請選擇檔案' });
        }
        
        // 讀取 Excel 檔案
        var workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        var sheetName = workbook.SheetNames[0];
        var worksheet = workbook.Sheets[sheetName];
        var data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            return res.status(400).json({ success: false, message: 'Excel 檔案沒有資料' });
        }
        
        // 驗證必要欄位
        var requiredFields = ['uid', 'name', 'table_num'];
        var firstRow = data[0];
        var missingFields = requiredFields.filter(f => !(f in firstRow));
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: '缺少必要欄位: ' + missingFields.join(', ') 
            });
        }
        
        // 使用 pg 直接執行批次操作
        var client = await pg.connect();
        try {
            await client.query('BEGIN');
            
            // 清空現有人員資料
            await client.query('DELETE FROM person');
            
            // 批次插入新資料
            var insertCount = 0;
            for (var row of data) {
                var uid = String(row.uid || '').trim();
                var name = String(row.name || '').trim();
                var table_num = parseInt(row.table_num) || 0;
                
                if (uid && name) {
                    await client.query(
                        'INSERT INTO person(uid, name, table_num) VALUES($1, $2, $3)',
                        [uid, name, table_num]
                    );
                    insertCount++;
                }
            }
            
            await client.query('COMMIT');
            
            console.log('上傳人員資料成功，共 ' + insertCount + ' 筆');
            res.json({ 
                success: true, 
                message: '人員資料上傳成功',
                count: insertCount
            });
            
        } catch (dbErr) {
            await client.query('ROLLBACK');
            throw dbErr;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('上傳人員資料失敗:', err);
        res.status(500).json({ success: false, message: '處理檔案失敗: ' + err.message });
    }
});

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

        // 檢查候選人數量
        if (upairs.length === 0) {
          req.session['msg'] = '錯誤：沒有可抽獎的候選人！所有人都已中獎或尚未註冊。';
          res.redirect('/gameplay');
          return;
        }

        // 檢查候選人數是否足夠
        var requiredCount = (gameType == 1) ? 1 : count; // 大獎每次抽1人，普通獎抽 count 人
        if (upairs.length < requiredCount) {
          req.session['msg'] = '錯誤：候選人數不足！目前只有 ' + upairs.length + ' 人，但需要抽出 ' + requiredCount + ' 人。';
          res.redirect('/gameplay');
          return;
        }

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
        
        console.log('[execute] gameType=' + gameType + ', reminderCount=' + reminderCount + ', count=' + count);
        
        if (gameType == 0 && reminderCount >= count)
        {
          // normal game - 先設定為開獎中，動畫結束後才寫入結果
          gameDao.startDrawing(gameId, () => {
            // 將候選人存入 session，等動畫結束後再寫入資料庫
            req.session['pending_candidates'] = candidates;
            req.session['pending_count'] = count;
            req.session['pending_gameId'] = gameId;
            req.session['pending_game'] = game;
            
            console.log('[execute] Normal game, 設定 pending_candidates=' + candidates.length + ', pending_count=' + count);
            
            // 確保 session 保存後再 redirect
            req.session.save(function(err) {
              if (err) {
                console.error('[execute] Session save error:', err);
              }
              res.redirect('/listWinnerDramaly/'+gameId);
            });
          });
        }
        else if (gameType == 1 && reminderCount >= 1) 
        {
          // big game - 先設定為開獎中，動畫結束後才寫入結果

          personDao.findByGid(game.id, (rePerson) => {
            if (playRightNow === 'true') {
                // 設定狀態為開獎中，但不立即寫入中獎結果
                gameDao.startDrawing(gameId, () => {});
                
                // 將候選人資訊存入 session，等動畫結束後再寫入
                req.session['pending_candidates'] = candidates;
                req.session['pending_gameId'] = gameId;
                req.session['pending_game'] = game;
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
        else
        {
          // 條件不滿足，顯示錯誤訊息
          console.log('[execute] 條件不滿足: gameType=' + gameType + ', reminderCount=' + reminderCount + ', count=' + count);
          if (reminderCount < count) {
            req.session['msg'] = '錯誤：剩餘名額不足！剩餘 ' + reminderCount + ' 名，但需要抽出 ' + count + ' 名。';
          } else {
            req.session['msg'] = '錯誤：無法執行此獎項類型';
          }
          res.redirect('/gameplay');
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
      var game = games[0];
      
      // 檢查是否正在開獎中
      var drawingStatus = game.drawing_status || 0;
      
      if (drawingStatus === 1) {
        // 開獎中，顯示等待頁面
        res.render('pages/listWinner', {
          results: [],
          isDrawing: true,
          gameName: game.award_list,
          gid: gid
        });
        return;
      }

      personDao.findByGid(gid, (rePerson) => {
        //rePerson.gid = games[0].gid;
        for (var i = 0; i < rePerson.results.length; i++) {
          rePerson.results[i].awardList = games[0].award_list;
        }
        rePerson.isDrawing = false;
        rePerson.gid = gid;
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
    
    // 檢查是否有待開獎的資料（開獎中狀態）
    var pendingCandidates = req.session['pending_candidates'];
    var pendingCount = req.session['pending_count'];
    var pendingGame = req.session['pending_game'];
    
    console.log('[listWinnerDramaly] gid=' + gid + ', pendingCandidates=' + (pendingCandidates ? pendingCandidates.length : 'null') + ', pendingCount=' + pendingCount + ', pendingGame=' + (pendingGame ? pendingGame.id : 'null'));
    
    gameDao.find(gid, (reGame) => {
        var games = reGame.results;
        var game = games[0];
        
        // 檢查 game 的 drawing_status
        var drawingStatus = game.drawing_status || 0;
        console.log('[listWinnerDramaly] game.drawing_status=' + drawingStatus);
        
        // 如果 game 正在開獎中但 session 沒有資料，說明流程被中斷
        // 重置狀態並導回抽獎頁面
        if (drawingStatus === 1 && (!pendingCandidates || !pendingGame || pendingGame.id != gid)) {
            console.log('[listWinnerDramaly] 開獎中但 session 資料遺失，重置狀態');
            gameDao.resetDrawingStatus(gid, () => {
                req.session['msg'] = '抽獎流程中斷，請重新開始抽獎';
                res.redirect('/playNormal/' + gid);
            });
            return;
        }
        
        // 如果是開獎中狀態（有 pending 資料），使用 session 中的候選人
        if (pendingCandidates && pendingCandidates.length > 0 && pendingGame && pendingGame.id == gid) {
            // 從候選人 uid 取得完整資料用於顯示
            var winnersToShow = [];
            var processedCount = 0;
            var totalCount = Math.min(pendingCount || pendingCandidates.length, pendingCandidates.length);
            
            console.log('[listWinnerDramaly] 開獎中狀態，totalCount=' + totalCount);
            
            // 當 totalCount 為 0 時，直接渲染空結果
            if (totalCount === 0) {
                console.log('[listWinnerDramaly] totalCount 為 0，渲染空結果');
                res.render('pages/listWinnerDramaly', {
                    results: [],
                    gid: gid,
                    isDrawing: true,
                    showAnimation: true
                });
                return;
            }
            
            for (var i = 0; i < totalCount; i++) {
                (function(index) {
                    var uid = pendingCandidates[index];
                    personDao.findByUid(uid, (rePerson) => {
                        // 使用 == 比較，避免類型不匹配問題
                        var person = rePerson.results.find(p => p.uid == uid);
                        console.log('[listWinnerDramaly] 查詢 uid=' + uid + ', 找到=' + (person ? 'yes' : 'no') + ', 結果數=' + rePerson.results.length);
                        if (person) {
                            winnersToShow[index] = {
                                uid: person.uid,
                                name: person.name,
                                table_num: person.table_num,
                                awardList: game.award_list
                            };
                        }
                        processedCount++;
                        
                        if (processedCount === totalCount) {
                            // 過濾掉 undefined
                            winnersToShow = winnersToShow.filter(w => w);
                            console.log('[listWinnerDramaly] 渲染結果，winnersToShow.length=' + winnersToShow.length);
                            res.render('pages/listWinnerDramaly', {
                                results: winnersToShow,
                                gid: gid,
                                isDrawing: true,  // 標記為開獎中
                                showAnimation: true  // 開獎主持人頁面：顯示動畫
                            });
                        }
                    });
                })(i);
            }
        } else {
            // 已經開獎完成，從資料庫取得中獎者
            personDao.findByGid(gid, (rePerson) => {
                for (var i = 0; i < rePerson.results.length; i++) {
                    rePerson.results[i].awardList = game.award_list;
                }

                console.log({length:rePerson.results.length});
                rePerson.gid = gid;
                rePerson.isDrawing = false;
                rePerson.showAnimation = false;  // 觀眾頁面：不顯示動畫，直接列出結果
                res.render('pages/listWinnerDramaly', rePerson);
            });
        }
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

// 完成普通獎開獎 - 動畫結束後呼叫此 API 寫入中獎結果
app.post('/completeNormalDrawing/:gid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var candidates = req.session['pending_candidates'];
    var count = req.session['pending_count'];
    var game = req.session['pending_game'];
    
    if (!candidates || !game) {
        res.status(400).json({ error: '開獎資料遺失，請重新開獎' });
        return;
    }
    
    // 現在才真正寫入中獎結果
    historyDao.saveOne(gid, candidates);
    gameDao.played(game, count);
    personDao.allPlayed(game.id, candidates, count, () => {});
    
    // 設定狀態為已完成
    gameDao.completeDrawing(gid, () => {
        // 清除 session 中的暫存資料
        req.session['pending_candidates'] = null;
        req.session['pending_count'] = null;
        req.session['pending_gameId'] = null;
        req.session['pending_game'] = null;
        
        res.json({ success: true });
    });
});

// 完成大獎開獎 - 動畫結束後呼叫此 API 寫入中獎結果
app.post('/completeBigDrawing/:gid/:uid', basicAuth, (req, res) => {
    var gid = req.params.gid;
    var uid = req.params.uid;
    var candidates = req.session['pending_candidates'];
    var game = req.session['pending_game'];
    
    if (!candidates || !game) {
        res.status(400).json({ error: '開獎資料遺失，請重新開獎' });
        return;
    }
    
    // 現在才真正寫入中獎結果
    historyDao.saveOne(gid, candidates);
    gameDao.played(game, 1);
    personDao.allPlayed(game.id, [uid], 1, () => {});
    
    // 設定狀態為已完成
    gameDao.completeDrawing(gid, () => {
        // 清除 session 中的暫存資料
        req.session['pending_candidates'] = null;
        req.session['pending_gameId'] = null;
        req.session['pending_game'] = null;
        
        res.json({ success: true });
    });
});

// 檢查開獎狀態 API
app.get('/checkDrawingStatus/:gid', (req, res) => {
    var gid = req.params.gid;
    
    gameDao.find(gid, (result) => {
        if (result.results && result.results.length > 0) {
            var game = result.results[0];
            var status = game.drawing_status || 0;
            res.json({ 
                gid: gid,
                drawing_status: status,
                is_drawing: status === 1  // 1 = 開獎中
            });
        } else {
            res.status(404).json({ error: '找不到此獎項' });
        }
    });
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

// API: 執行一般抽獎並返回 JSON 結果
app.post('/api/executeNormal/:gameId', basicAuth, (req, res) => {
    var gameId = req.params.gameId;

    gameDao.find(gameId, (it) => {
        var game = it.results[0];
        var count = game.participant_count;
        var reminderCount = game.reminder_count;

        if (reminderCount < count) {
            return res.json({ success: false, error: '剩餘名額不足！剩餘 ' + reminderCount + ' 名，但需要抽出 ' + count + ' 名。' });
        }

        personDao.findAllRegisteredWithoutAward((re) => {
            var list = re.results;
            var upairs = list.map((it) => { 
                return { uid: it.uid, name: it.name, table_num: it.table_num };
            });

            if (upairs.length === 0) {
                return res.json({ success: false, error: '沒有可抽獎的候選人！所有人都已中獎或尚未註冊。' });
            }

            if (upairs.length < count) {
                return res.json({ success: false, error: '候選人數不足！目前只有 ' + upairs.length + ' 人，但需要抽出 ' + count + ' 人。' });
            }

            // 洗牌
            for (let i = 0; i < 500; i++) {
                shuffle(upairs);
            }

            // 取得中獎者
            var winners = upairs.slice(0, count);
            var winnerUids = winners.map(w => w.uid);

            // 開始抽獎
            gameDao.startDrawing(gameId, () => {
                // 存入 session 以備完成時使用
                req.session['pending_candidates'] = winnerUids;
                req.session['pending_count'] = count;
                req.session['pending_gameId'] = gameId;
                req.session['pending_game'] = game;

                req.session.save(function(err) {
                    // 返回中獎者列表
                    res.json({
                        success: true,
                        winners: winners,
                        awardList: game.award_list,
                        gid: gameId
                    });
                });
            });
        });
    });
});

app.get('/playNormal/:gid', basicAuth, (req, res) => {
  var gid = req.params.gid;

  gameDao.find(gid, (reGame) => {
    var game = reGame.results[0];
    // 載入已中獎者列表
    personDao.findByGid(gid, (rePerson) => {
      res.render('pages/startPlayNormal', {
        reminderCount: game.reminder_count, 
        gid: game.id,
        gameName: game.award_list,
        existingWinners: rePerson.results || []
      });
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
