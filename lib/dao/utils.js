
var dateFormat = require('dateformat');

var pg = require('pg');
const config = require('./config');

// 使用 pg@8 的連線池
var pool = new pg.Pool({
    connectionString: config.connectionString,
    ssl: config.sslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10
});

// 測試連線
pool.connect()
    .then(function(client) {
        console.log('Database connected successfully!');
        client.release();
    })
    .catch(function(err) {
        console.error('Database connection test failed:', err.message);
    });

// 記錄連線計數
var queryCount = 0;

var query = (sl, v, callback) => {
    var queryId = ++queryCount;
    
    console.log('[DB][Query #' + queryId + '] Starting...');
    console.log('[DB][Query #' + queryId + '] SQL: ' + sl.substring(0, 100) + (sl.length > 100 ? '...' : ''));
    var startTime = Date.now();
    
    pool.query(sl, v)
        .then(function(result) {
            var queryTime = Date.now() - startTime;
            var rowCount = result.rows ? result.rows.length : 0;
            console.log('[DB][Query #' + queryId + '] OK, rows: ' + rowCount + ' (' + queryTime + 'ms)');
            handleQueryResult(null, result, sl, callback);
        })
        .catch(function(err) {
            var queryTime = Date.now() - startTime;
            console.error('[DB][Query #' + queryId + '] ERROR (' + queryTime + 'ms):', err.message);
            handleQueryResult(err, null, sl, callback);
        });
};

function handleQueryResult(err, result, sl, callback) {
    var obj = {msg: '', results: []};
    if (err) {
        console.error('Query error:', err.message);
        console.error('SQL:', sl);
        obj.msg = 'Query Failed';
        obj.error = err;
    } else {
        if (result.rows) {
            result.rows.forEach((it) => {
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
}

exports.query = query;
