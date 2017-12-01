var query = require('./utils').query;
var queryBack = require('./utils').queryBack;

var findAllRegistered = (callback) => {
    findRegisterd('all', callback);
}
exports.findAllRegistered = findAllRegistered;

var findAllRegisteredWithoutAward = (callback) => {
    findRegisterd('withoutAward', callback);
}
exports.findAllRegisteredWithoutAward = findAllRegisteredWithoutAward ; 

var findRegisterd = (scope, callback) => {
    var sl = 'SELECT * from person where registration_time is not null';
    
    if (scope == 'withoutAward') {
        sl += ' AND award_time is null ';
    } else if (scope != 'all') {
        sl += " AND uid = '" + scope + "'";
    }

    queryBack(sl, [], callback);
}

var findByUid  = (uid, callback) => {
  var sl = "SELECT * from person where uid like '%"+ uid +"%'";
  queryBack(sl, [], callback);
}
exports.findByUid = findByUid;

var findByName  = (name, callback) => {
  var sl = "SELECT * from person where name like '%"+ name +"%'";
  queryBack(sl, [], callback);
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

//var registerByName = (name, callback) => {
//    const sl = 'UPDATE person SET registration_time = NOW() WHERE name = $1';
//    const vle = [name];
//    query(sl, vle, callback);
//}
//exports.register = register;

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

var updateReward = (gameId, uids, countPerTime, callback) => {
    for (i = 0; i < countPerTime; i++) { 
         played(gameId, uids[i], callback);
    }
}
exports.updateReward = updateReward;