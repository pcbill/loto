// 資料庫連線設定
var connectionString;

if (process.env.DATABASE_URL) {
    // 檢查是否需要 SSL (本地開發不需要)
    var useSSL = process.env.DATABASE_SSL !== 'false';
    connectionString = process.env.DATABASE_URL + (useSSL ? '?ssl=true' : '');
} else {
    // 預設本地開發用
    connectionString = 'postgres://postgres:postgres@localhost:5432/loto';
}

console.log('Database SSL:', process.env.DATABASE_SSL !== 'false');

exports.connectionString = connectionString;
