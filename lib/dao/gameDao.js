var pg = require('pg');
const connectionString = require('./config').connectionString;
var dateFormat = require('dateformat');

var findAll = (callback) => {
    find('all', callback);
}
exports.findAll = findAll;

var find = (scope, callback) => {
    var sl = 'SELECT * from game ';
    if (scope != 'all') {
        sl += ' AND gid = ' + scope;
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

