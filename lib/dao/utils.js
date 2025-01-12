
var dateFormat = require('dateformat');

var pg = require('pg');
const connectionString = require('./config').connectionString;

var query = (sl, v, callback) => {
    pg.connect(coFnnectionString, function(err, client, done) {
      if (err) throw err;
        client.query(sl, v, function(err, result) {
          done();
        
          var obj = {msg: '', results: []};
          if (err) {
            console.error(err); 
            obj.msg = 'Fail';
          } else {
            if (result.rows) {
              result.rows.forEach((it)=>{
                var f = 'yyyy/mm/dd HH:MM:ss';
                var eightHours = 8 * 3600000;
                if (it.registration_time) {
                  var regTime = it.registration_time.getTime() + eightHours;
                  it.registration_time = dateFormat(regTime, f);
                }
                if (it.award_time) {
                  var awardTime = it.award_time.getTime() + eightHours;
                  it.award_time = dateFormat(awardTime, f);
                } 
                if (it.getgift_time) {
                  var getGiftTime = it.getgift_time.getTime() + eightHours;
                  it.getgift_time = dateFormat(getGiftTime, f);
                }
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
