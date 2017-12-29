
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
                if (it.registration_time) it.registration_time = dateFormat(it.registration_time, f);
                if (it.award_time) {
                  var awardTime = it.award_time + (8 * 60 * 60 * 1000)
                  it.award_time = dateFormat(awardTime, f);
                } 
                if (it.getgift_time) it.getgift_time = dateFormat(it.getgift_time, f);
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