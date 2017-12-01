var pg = require('pg');
const connectionString = require('./config').connectionString;

var query = (sl, v, callback) => {
    pg.connect(connectionString, function(err, client, done) {
        client.query(sl, v, function(err, result) {
          done();
          if (err) {
            console.error(err); 
            callback({msg: 'fail'});
          } else {
            var obj = {msg: ''};
            if (result.rows) {
              obj.results = result.rows;
            }
            callback(obj);
          }
        });
    });
}
exports.query = query;