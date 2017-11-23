var pg = require('pg');
const connectionString = require('./config').connectionString;


var findAllRegistered = (callback) => {
    findRegisterd('all', callback);
}
exports.findAllRegistered = findAllRegistered;

var findAllRegisteredWithoutAward = (callback) => {
    findRegisterd('withoutAward', callback);
}
exports.findAllRegisteredWithoutAward = findAllRegisteredWithoutAward ; 

//var findByAwarded = (gameId, callback) => {
//    var sl = 'SELECT * from person where registration_time is not null';
//        sl += ' AND award_time is not null ';
//        sl += ' AND award_game_id = ' + gameId;
//    
//    pg.connect(connectionString, (err, client, done) => {
//      client.query(sl, (err, result) => {
//        done();
//        if (err) {
//          console.error(err); //res.send("Error " + err);
//        } else {
//          callback(result.rows);
//        }
//      });
//    });
//}
//exports.findByAwarded = findByAwarded;

var findRegisterd = (scope, callback) => {
    var sl = 'SELECT * from person where registration_time is not null';
    
    if (scope == 'withoutAward') {
        sl += ' AND award_time is null ';
    } else if (scope != 'all') {
        sl += " AND uid = '" + scope + "'";
    }
    pg.connect(connectionString, (err, client, done) => {
      client.query(sl, (err, result) => {
        done();
        if (err) {
          console.error(err); //res.send("Error " + err);
        } else {
          callback({results: result.rows});
        }
      });
    });
}

var find  = (uid, callback) => {
  var sl = "SELECT * from person where uid like '%" + uid + "%'";
  
  pg.connect(connectionString, (err, client, done) => {
    client.query(sl, (err, result) => {
      done();
      if (err) {
        console.error(err); //res.send("Error " + err);
      } else {
        callback({results: result.rows});
      }
    });
  });
}
exports.find = find;

var deleteOne = (id, callback) => {
    //const sl = 'DELETE from person WHERE id = $1';
    const sl = 'UPDATE person SET registration_time = null WHERE id = $1';
    const v = [id]
    pg.connect(connectionString, (err, client, done) => {
      client.query(sl, v, (err, result) => {
        done();
        if (err) {
          console.error(err); //res.send("Error " + err);
        } else {
          callback();
        }
      });
    });
}
exports.deleteOne = deleteOne;

var query = (queryStr, vles, callback) => {
    pg.connect(connectionString, (err, client, done) => {
        client.query(queryStr, vles, (err, result) => {
          done();
          if (err) {
            console.error(err); //res.send("Error " + erv);
          } else {
            callback();
          }
        });
      });
}

var register = (uid, callback) => {
    const sl = 'UPDATE person SET registration_time = NOW() WHERE uid = $1';
    const vle = [uid];
    query(sl, vle, callback);
}
exports.register = register;

var getGift  = (uid, callback) => {
  const sl = 'UPDATE person SET getgift_time = NOW() WHERE uid = $1';
  const vle = [uid];
  query(sl, vle, callback);
}
exports.getGift = getGift;


var played = (gid, id, callback) => {
    const sl = 'UPDATE person SET award_game_id = $2, award_time = NOW() WHERE uid = $1';
    const vle = [id, gid];
    query(sl, vle, callback);
}

var updateReward = (game, uids, countPerTime, callback) => {
  var gameId = game.id;
    for (i = 0; i < countPerTime; i++) { 
         played(gameId, uids[i], callback);
    }
}
exports.updateReward = updateReward;