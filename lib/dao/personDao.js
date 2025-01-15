var query = require('./utils').query;

var findAllRegistered = (callback) => {
    findRegisterd('all', callback);
}
exports.findAllRegistered = findAllRegistered;

var findAllRegisteredWithoutAward = (callback) => {
    findRegisterd('withoutAward', callback);
}
exports.findAllRegisteredWithoutAward = findAllRegisteredWithoutAward ; 

var countRegisteredWithoutAward = (callback) => {
    var sl = 'SELECT count(*) from person where registration_time is not null AND award_time is null ';
    query(sl, [], (obj) => {
      callback(obj.results[0].count);   
    });
}
exports.countRegisteredWithoutAward = countRegisteredWithoutAward ; 

var findRegisterd = (scope, callback) => {
    var sl = 'SELECT * from person where registration_time is not null';
    
    if (scope == 'withoutAward') {
        sl += ' AND award_time is null ';
    } else if (scope != 'all') {
        sl += " AND uid = '" + scope + "'";
    }
    sl += " order by registration_time desc";

    query(sl, [], callback);
}

var updateNormalGameWinnerFromNullGetGiftimeToVoucher = (uids, callback) => {
    var uidsStr = uids.join("','");

    var sl =
        ' UPDATE person ' +
        ' SET award_game_id = 99998, award_time = NOW() ' +
        ' WHERE 1=1 ' +
        ' AND award_time is not null ' +
        ' AND getgift_time is null ' +
        " AND uid in ('" + uidsStr + "') "
    ;
    query(sl, [], callback);
}
exports.updateNormalGameWinnerFromNullGetGiftimeToVoucher = updateNormalGameWinnerFromNullGetGiftimeToVoucher;

var findByUid  = (uid, callback) => {
  var sl = "SELECT * from person where uid like '%"+ uid +"%'";
  query(sl, [], callback);
}
exports.findByUid = findByUid;

var findByGid  = (gid, callback) => {
  var sl = "SELECT * from person where award_game_id = $1 order by award_time desc";
  const vle = [gid];
  query(sl, vle, callback);
}
exports.findByGid = findByGid;

var findNotGetByGid  = (gid, callback) => {
    var sl = "SELECT * from person " +
        " where award_game_id = $1 and getgift_time is null" +
        " order by award_time desc";
    const vle = [gid];
    query(sl, vle, callback);
}
exports.findNotGetByGid = findNotGetByGid;

var findByReplay  = (callback) => {
    var sl = "SELECT * from person " +
        " left join game on game.id = person.award_game_id " +
        " where 1=1 " +
        " and replay_count = 1 " +
        " and person.award_game_id < 90000 " +
        " order by award_time desc";
    const vle = [];
    query(sl, vle, callback);
}
exports.findByReplay = findByReplay;

var findByName  = (name, callback) => {
  var sl = "SELECT * from person where name like '%"+ name +"%'";
  query(sl, [], callback);
}
exports.findByName = findByName;

var deleteOne = (id, callback) => {
    const sl = 'UPDATE person SET registration_time = null WHERE id = $1';
    const vle = [id];
    query(sl, vle, callback);
}
exports.deleteOne = deleteOne;

var register = (uid, callback) => {
    const sl = 'UPDATE person SET registration_time = NOW() WHERE uid = $1';
    const vle = [uid];
    query(sl, vle, callback);
}
exports.register = register;

var registerByName = (name, callback) => {
    const sl = 'UPDATE person SET registration_time = NOW() WHERE name = $1';
    const vle = [name];
    query(sl, vle, callback);
}
exports.registerByName = registerByName;

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

var replayed = (gid, id, callback) => {
    const sl = 'UPDATE person SET award_game_id = $2, award_time = NOW(), replay_count = 1 ' +
                        ' WHERE uid = $1 ';
    const vle = [id, gid];
    query(sl, vle, callback);
}

var allPlayed = (gameId, uids, countPerTime, callback) => {
    for (i = 0; i < countPerTime; i++) { 
         played(gameId, uids[i], callback);
    }
}
exports.allPlayed = allPlayed;

var allRePlayed = (gameId, uids, countPerTime, callback) => {
    for (i = 0; i < countPerTime; i++) {
        replayed(gameId, uids[i], callback);

        var sec = (countPerTime / 10) +1;
        console.log("replayed waiting secs: " + sec);
        // await sleep(sec * 1000);
        const start = new Date();
        while (new Date() - start < sec * 1000) {}
    }
}
exports.allRePlayed = allRePlayed;

var cancelReward = (id, callback) => {
    const sl = 'UPDATE person SET award_game_id = null, award_time = null WHERE uid = $1';
    const vle = [id];
    query(sl, vle, callback);
}
exports.cancelReward = cancelReward;

var cancelRewardByGid = (gid, callback) => {
    const sl = 'UPDATE person SET award_game_id = null, award_time = null, getgift_time = null WHERE award_game_id = $1';
    const vle = [gid];
    query(sl, vle, callback);   
}
exports.cancelRewardByGid = cancelRewardByGid;

var saveOne = (uid, name, table_num, callback) => {
  const sl = 'INSERT INTO person(uid, name, table_num, registration_time) VALUES($1, $2, $3, NOW()) RETURNING *'
  const vle = [uid, name, table_num];
  query(sl, vle, callback);
} 
exports.saveOne = saveOne;
