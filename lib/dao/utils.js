var pg = require('pg');
const connectionString = require('./config').connectionString;

var query = (sl, v, callback) => {
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
exports.query = query;

var queryBack = (sl, v, callback) => {
  pg.connect(connectionString, (err, client, done) => {
    client.query(sl, v, (err, result) => {
      done();
      if (err) {
        console.error(err); //res.send("Error " + err);
      } else {
        callback({results: result.rows, msg: ''});
      }
    });
  });
}
exports.queryBack = queryBack;