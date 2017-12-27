
var dateFormat = require('dateformat');

var pg = require('pg');
const connectionString = require('./config').connectionString;

var query = (sl, v, callback) => {
    pg.connect(connectionString, function(err, client, done) {
        client.query(sl, v, function(err, result) {
          done();
        
          var obj = {msg: '', results: []};
          if (err) {
            console.error(err); 
            obj.msg = 'Fail';
          } else {
            if (result.rows) {
              result.rows.forEach((it)=>{
                var f = 'yyyy/mm/dd hh:MM:ss';
                it.registration_time = dateFormat(it.registration_time, f);
                it.award_time = dateFormat(it.award_time, f);
                it.getgift_time = dateFormat(it.getgift_time, f);
              });
              obj.results = result.rows;
            } else {
              obj.results = result;
            }
          }
          callback(obj);
        });
    });
}
exports.query = query;