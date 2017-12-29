
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
                var f = 'yyyy/mm/dd HH:MM:ss';
                if (it.registration_time) {
                  var regTime = it.registration_time.getTime() + (8 * 360000);
                  it.registration_time = dateFormat(regTime, f);
                }
                if (it.award_time) {
                  var awardTime = it.award_time.getTime() + (8 * 360000);
                  console.log('------'+it.award_time);
                  it.award_time = dateFormat(awardTime, f);
                  console.log(it.award_time);
                } 
                if (it.getgift_time) {
                  var getGiftTime = it.getgift_time.getTime() + (8 * 360000);
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