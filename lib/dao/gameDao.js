var pg = require('pg');
const connectionString = require('./config').connectionString;
var dateFormat = require('dateformat');

var saveOne = (gid, award_list, participant_count, type, callback) => {
  const sl = 'INSERT INTO game(gid, award_list, participant_count, exec_type) VALUES($1, $2, $3, $4) RETURNING *'
  const vle = [gid, award_list, participant_count, type];
  pg.connect(connectionString, function(err, client, done) {
    client.query(sl, vle, function(err, result) {
      done();
      if (err) {
        console.error(err); //res.send("Error " + err);
      } else {
        callback();
      }
    });
  });
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

    pg.connect(connectionString, (err, client, done) => {
      client.query(sl, (err, result) => {
        done();
        if (err) {
          console.error(err); //res.send("Error " + err);
        } else {
          //result.rows.forEach((it)=>{
          //  it.registration_time = dateFormat(it.registration_time, 'yyyy/mm/dd hh:MM:ss');
          //});
          callback({results: result.rows});
        }
      });
    });
}
exports.find = find;

var deleteOne = (id, callback) => {
    const sl = 'DELETE from game WHERE id = $1';
    const v = [id]
    pg.connect(connectionString, function(err, client, done) {
      client.query(sl, v, function(err, result) {
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


var played = (id) => {
  const sl = 'UPDATE game SET played_time = NOW() WHERE id = $1';
  const v = [id]
  pg.connect(connectionString, function(err, client, done) {
    client.query(sl, v, function(err, result) {
      done();
      if (err) {
        console.error(err); //res.send("Error " + err);
      } else {
        console.log('game played ' + id);
      }
    });
  });
}
exports.played = played;
