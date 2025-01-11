var query = require('./utils').query;

var saveOne = (gid, award_list, participant_count, type, callback) => {
  const sl = 'INSERT INTO game(gid, award_list, participant_count, reminder_count, exec_type) VALUES($1, $2, $3, $3, $4) RETURNING *'
  const vle = [gid, award_list, participant_count, type];
  query(sl, vle, callback);
} 
exports.saveOne = saveOne;
  
var findAll = (callback) => {
    find('all', callback);
}
exports.findAll = findAll;

var find = (scope, callback) => {
  var sl = 'SELECT * from game ';
  if (scope != 'all') {
    sl += " WHERE id = " + scope;
  }
  sl += " order by create_time";

  query(sl, [], callback);
}
exports.find = find;

var findByExecType = (type, callback) => {
  var sl = 'SELECT * from game ';
  sl += " WHERE exec_type = " + type;
  sl += " order by create_time";

  query(sl, [], callback);
}
exports.findByExecType = findByExecType;

var deleteOne = (id, callback) => {
    const sl = 'DELETE from game WHERE id = $1';
    const vle = [id]
    query(sl, vle, callback);
}
exports.deleteOne = deleteOne;


var played = (game, count) => {
  var id = game.id;
  var reminder_count = game.reminder_count - count;

  const sl = 'UPDATE game SET played_time = NOW(), reminder_count = $2 WHERE id = $1';
  const vle = [id, reminder_count];
  query(sl, vle, () => {
    console.log('game('+ id +') played ');
  });
}
exports.played = played;

var cancelOneReward = (id) => {
  const sl = 'UPDATE game SET played_time = NOW(), reminder_count = reminder_count + 1 WHERE id = $1';
  const vle = [id];
  query(sl, vle, () => {
    console.log('game('+ id +') canceled one winner ');
  });
}
exports.cancelOneReward = cancelOneReward;
