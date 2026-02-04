'use strict';

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
  var params = [];
  if (scope != 'all') {
    sl += ' WHERE id = $1';
    params.push(scope);
  }
  sl += ' order by gid';

  query(sl, params, callback);
}
exports.find = find;

var findByExecType = (type, callback) => {
  var sl = 'SELECT * from game ';
  sl += ' WHERE exec_type = $1';
  sl += ' order by gid';

  query(sl, [type], callback);
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

var cancelOneReward = (id, callback) => {
  const sl = 'UPDATE game SET played_time = NOW(), reminder_count = reminder_count + 1 WHERE id = $1';
  const vle = [id];
  query(sl, vle, callback);
}
exports.cancelOneReward = cancelOneReward;

// 開獎狀態常數
const DRAWING_STATUS = {
  NOT_STARTED: 0,  // 未開獎
  IN_PROGRESS: 1,  // 開獎中
  COMPLETED: 2     // 已完成
};
exports.DRAWING_STATUS = DRAWING_STATUS;

// 設定開獎狀態為「開獎中」
var startDrawing = (id, callback) => {
  const sl = 'UPDATE game SET drawing_status = $2 WHERE id = $1';
  const vle = [id, DRAWING_STATUS.IN_PROGRESS];
  query(sl, vle, callback);
}
exports.startDrawing = startDrawing;

// 設定開獎狀態為「已完成」
var completeDrawing = (id, callback) => {
  const sl = 'UPDATE game SET drawing_status = $2 WHERE id = $1';
  const vle = [id, DRAWING_STATUS.COMPLETED];
  query(sl, vle, callback);
}
exports.completeDrawing = completeDrawing;

// 重置開獎狀態
var resetDrawingStatus = (id, callback) => {
  const sl = 'UPDATE game SET drawing_status = $2 WHERE id = $1';
  const vle = [id, DRAWING_STATUS.NOT_STARTED];
  query(sl, vle, callback);
}
exports.resetDrawingStatus = resetDrawingStatus;

// 檢查是否正在開獎中
var isDrawing = (id, callback) => {
  const sl = 'SELECT drawing_status FROM game WHERE id = $1';
  query(sl, [id], (result) => {
    if (result.results && result.results.length > 0) {
      callback(result.results[0].drawing_status === DRAWING_STATUS.IN_PROGRESS);
    } else {
      callback(false);
    }
  });
}
exports.isDrawing = isDrawing;
